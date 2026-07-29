package services

import (
	"chatapp/hub"
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

func (r *roomServices) TakeChatHistory(ctx context.Context, room_id string, limit int, lastTimeStamp time.Time) ([]hub.Message, error) {
	_, err := r.roomRepositories.GetById(ctx, room_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("Room wiht id %s not found : %w", room_id, err)
		}
		return nil, err
	}

	messages, err := r.roomRepositories.GetChatHistory(ctx, room_id, limit, lastTimeStamp)
	if err != nil {
		return nil, err
	}

	msgResponse := make([]hub.Message, 0, len(messages))

	for _, msg := range messages {
		decryptedContent, err := helper.Decrypt(msg.Content)
		if err != nil {
			decryptedContent = ""
		}

		decryptedCaption := ""
		if msg.Caption != "" {
			decryptedCaption, err = helper.Decrypt(msg.Caption)
			if err != nil {
				decryptedCaption = "Failed to load messages..."
			}
		}

		decryptedFileName := ""
		if msg.FileName != "" {
			decryptedFileName, err = helper.Decrypt(msg.FileName)
			if err != nil {
				decryptedFileName = msg.FileName
			}
		}

		item := hub.Message{
			ID:             msg.ID,
			RoomID:         msg.RoomID,
			UserID:         msg.UserID,
			Username:       msg.Username,
			Content:        decryptedContent,
			ProfilePicture: msg.ProfilePicture,
			Type:           msg.Type,
			IsRead:         msg.IsRead,
			Caption:        decryptedCaption,
			FileName:       decryptedFileName,
			TimeStamp:      msg.CreatedAt,
		}

		if msg.ReplyTo != nil {
			replyContent, err := helper.Decrypt(msg.ReplyTo.Content)
			if err != nil {
				replyContent = "Failed to load message..."
			}

			replyCaption := ""
			if msg.ReplyTo.Caption != "" {
				replyCaption, err = helper.Decrypt(msg.ReplyTo.Caption)
				if err != nil {
					replyCaption = "Failed to load message..."
				}
			}

			replyFileName := ""
			if msg.ReplyTo.FileName != "" {
				replyFileName, err = helper.Decrypt(msg.ReplyTo.FileName)
				if err != nil {
					replyFileName = msg.ReplyTo.FileName
				}
			}

			item.ReplyTo = &hub.Message{
				ID:             msg.ReplyTo.ID,
				UserID:         msg.ReplyTo.UserID,
				Username:       msg.ReplyTo.Username,
				ProfilePicture: msg.ReplyTo.ProfilePicture,
				Content:        replyContent,
				Type:           msg.ReplyTo.Type,
				Caption:        replyCaption,
				FileName:       replyFileName,
			}
		}
		msgResponse = append(msgResponse, item)
	}

	return msgResponse, nil
}
func (r *roomServices) TakeMediaMessages(ctx context.Context, roomId string, limit int, cursor time.Time) (*dto.MediaResponse, error) {
	messages, nextCursor, err := r.roomRepositories.GetMediaMessages(ctx, roomId, limit, cursor)
	if err != nil {
		return nil, err
	}

	msgResponse := make([]hub.Message, 0, len(messages))
	for _, msg := range messages {
		decryptedContent := msg.Content
		if msg.Content != "" {
			decryptedContent, err = helper.Decrypt(msg.Content)
			if err != nil {
				decryptedContent = msg.Content
			}
		}

		decryptedCaption := msg.Caption
		if msg.Caption != "" {
			decryptedCaption, err = helper.Decrypt(msg.Caption)
			if err != nil {
				decryptedCaption = msg.Caption
			}
		}

		decryptedFileName := msg.FileName
		if msg.FileName != "" {
			decryptedFileName, err = helper.Decrypt(msg.FileName)
			if err != nil {
				decryptedFileName = msg.FileName
			}
		}

		item := hub.Message{
			ID:             msg.ID,
			RoomID:         msg.RoomID,
			UserID:         msg.UserID,
			Username:       msg.Username,
			Content:        decryptedContent,
			ProfilePicture: msg.ProfilePicture,
			Type:           msg.Type,
			Caption:        decryptedCaption,
			FileName:       decryptedFileName,
			TimeStamp:      msg.CreatedAt,
		}

		msgResponse = append(msgResponse, item)
	}

	response := dto.MediaResponse{
		Media:      msgResponse,
		NextCursor: nextCursor,
	}

	return &response, nil
}
func (r *roomServices) RemoveMessage(ctx context.Context, msgId string) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	existsMsg, err := r.roomRepositories.GetMessageByID(ctx, msgId)
	if err != nil {
		return err
	}

	if userId != existsMsg.UserID {
		return helper.ErrNotAllowed
	}

	replyMsgs, err := r.roomRepositories.GetMessagesByReplyToID(ctx, existsMsg.ID)
	if err != nil {
		return err
	}

	for _, replyMsg := range replyMsgs {
		if replyMsg.Type == "image" || replyMsg.Type == "file" && replyMsg.Content != "" {
			decryptContent, err := helper.Decrypt(replyMsg.Content)
			if err != nil {
				return err
			}

			if err := r.storageServices.RemoveFile("uploads", decryptContent); err != nil {
				log.Printf("failed to remove reply image message :%v", err)
			}
		}
	}

	if existsMsg.Type == "image" || existsMsg.Type == "file" && existsMsg.Content != "" {
		decryptContent, err := helper.Decrypt(existsMsg.Content)
		if err != nil {
			return err
		}

		if err := r.storageServices.RemoveFile("uploads", decryptContent); err != nil {
			log.Printf("warn: failed to remove file %s: %v", decryptContent, err)
		}
	}

	if err := r.roomRepositories.DeleteMessageById(ctx, msgId); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("message with id: %s not found, %w", msgId, err)
		}
		return err
	}

	msgContent := existsMsg.Username + " Deleted the message"
	encryptMsg, err := helper.Encrypt(msgContent)
	if err != nil {
		return err
	}

	removeMsg := hub.Message{
		ID:              hub.GenerateId(),
		EditedMessageID: existsMsg.ID,
		RoomID:          existsMsg.RoomID,
		UserID:          userId,
		Username:        existsMsg.Username,
		Type:            "delete-message",
		Content:         msgContent,
		TimeStamp:       time.Now(),
	}

	saveMsg := models.Message{
		ID:        removeMsg.ID,
		RoomID:    removeMsg.RoomID,
		UserID:    removeMsg.UserID,
		Username:  removeMsg.Username,
		Type:      removeMsg.Type,
		Content:   encryptMsg,
		CreatedAt: removeMsg.TimeStamp,
	}

	r.roomRepositories.SaveMessage(saveMsg)
	r.hub.Broadcast <- removeMsg

	return nil
}
func (r *roomServices) RemoveMultipleMessages(ctx context.Context, req dto.MultipleMsgDeleteReq) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	existsMsg, err := r.roomRepositories.GetMultipleMessagesByIDs(ctx, req.MessageIDs)
	if err != nil {
		return err
	}

	for _, msg := range existsMsg {
		if userId != msg.UserID {
			return helper.ErrNotAllowed
		}

		replyMsgs, err := r.roomRepositories.GetMessagesByReplyToID(ctx, msg.ID)
		if err != nil {
			log.Printf("error getting reply messages: %v", err)
		}
		for _, replyMsg := range replyMsgs {
			if replyMsg.Type == "image" && replyMsg.Content != "" {
				decryptContent, err := helper.Decrypt(replyMsg.Content)
				if err == nil {
					if err := r.storageServices.RemoveFile("uploads", decryptContent); err != nil {
						log.Printf("failed to remove reply image: %v", err)
					}
				}
			}
		}

		if msg.Type == "image" && msg.Content != "" {
			decryptContent, err := helper.Decrypt(msg.Content)
			if err != nil {
				return err
			}
			if err := r.storageServices.RemoveFile("uploads", decryptContent); err != nil {
				log.Printf("warn: failed to remove file %s: %v", decryptContent, err)
			}
		}

		if err := r.roomRepositories.DeleteMessageById(ctx, msg.ID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("message with id: %s not found, %w", msg.ID, err)
			}
			return err
		}

		msgContent := msg.Username + " Deleted the message"
		encryptMsg, err := helper.Encrypt(msgContent)
		if err != nil {
			return err
		}

		removeMsg := hub.Message{
			ID:              hub.GenerateId(),
			EditedMessageID: msg.ID,
			RoomID:          msg.RoomID,
			UserID:          userId,
			Username:        msg.Username,
			Type:            "delete-message",
			Content:         msgContent,
			TimeStamp:       time.Now(),
		}

		saveMsg := models.Message{
			ID:        removeMsg.ID,
			RoomID:    removeMsg.RoomID,
			UserID:    removeMsg.UserID,
			Username:  removeMsg.Username,
			Type:      removeMsg.Type,
			Content:   encryptMsg,
			CreatedAt: removeMsg.TimeStamp,
		}

		r.roomRepositories.SaveMessage(saveMsg)
		r.hub.Broadcast <- removeMsg
	}

	return nil
}
func (r *roomServices) UpdateLastReadMessages(ctx context.Context, room_id string) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	_, err := r.roomRepositories.GetById(ctx, room_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Room id not found :%w", err)
		}
		return err
	}

	settings, err := r.userRepositories.GetSettings(ctx, userId)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	shouldSendReadReceipt := true
	if settings != nil && !settings.ReadReceipts {
		shouldSendReadReceipt = false
	}

	if err := r.roomRepositories.UpdateReadMessages(ctx, room_id, userId, time.Now()); err != nil {
		return err
	}

	if shouldSendReadReceipt {
		if err := r.roomRepositories.MarkMessageRead(ctx, room_id, userId); err != nil {
			return err
		}

		r.hub.Broadcast <- hub.Message{
			RoomID: room_id,
			UserID: userId,
			Type:   "readed",
		}
	}

	return nil
}
func (r *roomServices) UpdateMessage(ctx context.Context, msgId string, req *dto.MessageUpdateRequest) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	existsMsg, err := r.roomRepositories.GetMessageByID(ctx, msgId)
	if err != nil {
		return err
	}

	if userId != existsMsg.UserID {
		return helper.ErrNotAllowed
	}

	if req.Content != "" {
		encryptContent, err := helper.Encrypt(req.Content)
		if err != nil {
			return err
		}
		existsMsg.Content = encryptContent
	}

	if req.Caption != "" {
		encryptCaption, err := helper.Encrypt(req.Content)
		if err != nil {
			return err
		}
		existsMsg.Caption = encryptCaption
	}

	if err := r.roomRepositories.UpdateMessageById(ctx, msgId, existsMsg); err != nil {
		return err
	}

	msgContent := existsMsg.Username + " Edited message"
	encryptMsg, err := helper.Encrypt(msgContent)
	if err != nil {
		return err
	}

	updateMsg := hub.Message{
		ID:              hub.GenerateId(),
		EditedMessageID: existsMsg.ID,
		RoomID:          existsMsg.RoomID,
		UserID:          userId,
		Username:        existsMsg.Username,
		Type:            "update-message",
		Content:         msgContent,
		TimeStamp:       time.Now(),
	}

	saveMsg := models.Message{
		ID:        updateMsg.ID,
		RoomID:    updateMsg.RoomID,
		UserID:    updateMsg.UserID,
		Username:  updateMsg.Username,
		Type:      updateMsg.Type,
		Content:   encryptMsg,
		CreatedAt: updateMsg.TimeStamp,
	}

	r.roomRepositories.SaveMessage(saveMsg)
	r.hub.Broadcast <- updateMsg

	return nil
}
func (r *roomServices) FindMessageByID(ctx context.Context, message_id string) (*hub.Message, error) {
	message, err := r.roomRepositories.GetMessageByID(ctx, message_id)
	if err != nil {
		return nil, err
	}

	decrypt, err := helper.Decrypt(message.Content)
	if err == nil {
		message.Content = decrypt
	}

	if message.Caption != "" {
		decryptCaption, err := helper.Decrypt(message.Caption)
		if err == nil {
			message.Caption = decryptCaption
		}
	}

	if message.FileName != "" {
		decryptFileName, err := helper.Decrypt(message.FileName)
		if err == nil {
			message.FileName = decryptFileName
		}
	}

	response := hub.Message{
		ID:             message.ID,
		RoomID:         message.RoomID,
		UserID:         message.UserID,
		Username:       message.Username,
		Content:        message.Content,
		Type:           message.Type,
		Caption:        message.Caption,
		FileName:       message.FileName,
		ProfilePicture: message.ProfilePicture,
	}

	return &response, nil
}
func (r *roomServices) SaveMessage(msg hub.Message) error {
	var replyToID *string
	if msg.ReplyToID != "" {
		replyToID = &msg.ReplyToID
	}

	message := models.Message{
		ID:             msg.ID,
		RoomID:         msg.RoomID,
		UserID:         msg.UserID,
		Username:       msg.Username,
		ProfilePicture: msg.ProfilePicture,
		Content:        msg.Content,
		Type:           msg.Type,
		ReplyToID:      replyToID,
		Caption:        msg.Caption,
		FileName:       msg.FileName,
		CreatedAt:      time.Now(),
	}

	if err := r.roomRepositories.SaveMessage(message); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("Warning: Room or related record not found: %v", err)
		}
		log.Printf("Failed to save message: %v", err)
		return err
	}

	return nil
}
