package services

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"log"
	"mime/multipart"
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type roomServices struct {
	hub              *dto.Hub
	roomRepositories core.RoomRepositories
	userRepositories core.UserRepositories
	storageServices  core.StorageService
	frontendUrl      string
	backendUrl       string
	frontendJoinUrl  string
	roomsPath        string
	usersPath        string
	stickersPath     string
	uploadsPath      string
}

func NewRoomServices(hub *dto.Hub, roomRepo core.RoomRepositories, userRepo core.UserRepositories, storageServices core.StorageService) core.RoomServices {
	return &roomServices{
		hub:              hub,
		roomRepositories: roomRepo,
		userRepositories: userRepo,
		storageServices:  storageServices,
		frontendUrl:      os.Getenv("FRONTEND_URL"),
		backendUrl:       os.Getenv("BACKEND_URL"),
		frontendJoinUrl:  os.Getenv("FRONTEND_JOIN_URL"),
		roomsPath:        os.Getenv("ROOMS_PATH"),
		usersPath:        os.Getenv("USERS_PATH"),
		stickersPath:     os.Getenv("STICKERS_PATH"),
		uploadsPath:      os.Getenv("UPLOADS_PATH"),
	}
}

// FindAll implements [core.RoomServices].
func (r *roomServices) FindAll(ctx context.Context, filter string) ([]dto.RoomResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	rooms, err := r.roomRepositories.GetAll(ctx, filter, userId)
	if err != nil {
		return nil, err
	}

	roomIds := make([]string, len(rooms))
	for i, room := range rooms {
		roomIds[i] = room.ID
	}

	lastMsg, err := r.roomRepositories.GetLastMessages(ctx, roomIds)
	if err != nil {
		return nil, err
	}

	lastMsgMap := make(map[string]models.Message)
	for _, msg := range lastMsg {
		lastMsgMap[msg.RoomID] = msg
	}

	var response []dto.RoomResponse
	for _, room := range rooms {
		var picture string
		if room.Picture != nil {
			picture = helper.NormalizeImagePath(*room.Picture, r.backendUrl, r.roomsPath)
		}

		var roomLink string
		if room.RoomLink != nil {
			roomLink = *room.RoomLink
		}

		unreadMessage, err := r.roomRepositories.GetUnreadMessagesCount(ctx, room.ID, userId)
		if err != nil {
			return nil, err
		}

		item := dto.RoomResponse{
			ID:            room.ID,
			Picture:       &picture,
			Name:          room.Name,
			Description:   room.Description,
			RoomLink:      roomLink,
			Type:          room.Type,
			CreatedAt:     room.CreatedAt,
			UpdatedAt:     room.UpdatedAt,
			UnreadMessage: unreadMessage,
		}

		if room.Type == "private" {
			for _, m := range room.Members {
				pfp := ""
				if m.User.ProfilePicture != nil {
					pfp = helper.NormalizeImagePath(*m.User.ProfilePicture, r.backendUrl, r.usersPath)
				}
				item.Members = append(item.Members, dto.RoomMemberResponse{
					UserID:             m.UserID,
					Username:           m.User.Username,
					Name:               m.User.Name,
					UserProfilePicture: pfp,
				})
			}
		}

		if msg, ok := lastMsgMap[room.ID]; ok {
			decryptedContent, err := helper.Decrypt(msg.Content)
			if err != nil {
				decryptedContent = "Failed to load messages..."
			}

			decryptedCaption := msg.Caption
			if msg.Caption != "" {
				decryptedCaption, _ = helper.Decrypt(msg.Caption)
			}

			var senderName string
			if msg.User.Name != "" {
				senderName = msg.User.Name
			}

			lastMsg := dto.LastMessageInfo{
				Content:  decryptedContent,
				Username: msg.Username,
				Name:     senderName,
				SentAt:   msg.CreatedAt,
				Type:     msg.Type,
				Caption:  decryptedCaption,
			}
			item.LastMessage = &lastMsg
		}

		response = append(response, item)
	}

	return response, nil
}

// FindById implements [core.RoomServices].
func (r *roomServices) FindById(ctx context.Context, room_id string) (*dto.RoomResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	isMember, err := r.roomRepositories.IsMember(ctx, room_id, userId)
	if err != nil {
		return nil, err
	}

	if !isMember {
		return nil, fmt.Errorf("Anda bukan anggota dari grup ini: %w", err)
	}

	room, err := r.roomRepositories.GetById(ctx, room_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("Room dengan id %s tidak ditemukan: %w", room_id, err)
		}
		return nil, err
	}

	var picture string
	if room.Picture != nil {
		picture = helper.NormalizeImagePath(*room.Picture, r.backendUrl, r.roomsPath)
	}

	var roomLink string
	if room.RoomLink != nil {
		roomLink = *room.RoomLink
	}

	response := dto.RoomResponse{
		ID:          room.ID,
		Picture:     &picture,
		Name:        room.Name,
		Description: room.Description,
		RoomLink:    roomLink,
		Type:        room.Type,
		CreatedAt:   room.CreatedAt,
		UpdatedAt:   room.UpdatedAt,
	}

	return &response, nil
}

// GetRoomPreview implements [core.RoomServices].
func (r *roomServices) FindRoomPreview(ctx context.Context, room_link string) (*dto.RoomResponse, error) {
	room, err := r.roomRepositories.GetByLink(ctx, room_link)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("Room dengan link %s tidak ditemukan: %w", room_link, err)
		}
		return nil, err
	}

	var picture string
	if room.Picture != nil {
		picture = helper.NormalizeImagePath(*room.Picture, r.backendUrl, r.roomsPath)
	}

	var roomLink string
	if room.RoomLink != nil {
		roomLink = *room.RoomLink
	}

	response := dto.RoomResponse{
		ID:          room.ID,
		Picture:     &picture,
		Name:        room.Name,
		Description: room.Description,
		RoomLink:    roomLink,
		Type:        room.Type,
		CreatedAt:   room.CreatedAt,
		UpdatedAt:   room.UpdatedAt,
	}

	return &response, nil
}

// m implements [core.RoomServices].
func (r *roomServices) CreateRoom(ctx context.Context, room dto.RoomCreateRequest) error {
	roomLink := uuid.New().String()

	newRoom := models.Room{
		ID:        room.ID,
		OwnerID:   room.OwnerID,
		Name:      room.Name,
		RoomLink:  &roomLink,
		Type:      "group",
		CreatedAt: time.Now(),
	}

	newMember := models.RoomMember{
		RoomID:   room.ID,
		UserID:   room.OwnerID,
		Role:     "admin",
		JoinedAt: time.Now(),
	}

	if room.Picture != nil {
		newRoom.Picture = room.Picture
	}

	if room.Description != nil {
		newRoom.Description = room.Description
	}

	if err := r.roomRepositories.Insert(ctx, &newRoom); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Gagal membuat grup: %w", err)
		}
		return err
	}

	if err := r.roomRepositories.InsertRoomMembers(ctx, &newMember); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Gagal memasukan member: %w", err)
		}
		return err
	}

	return nil
}

// Update implements [core.RoomServices].
func (r *roomServices) Update(ctx context.Context, room_id string, roomReq *dto.RoomUpdateRequest) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	existRoom, err := r.roomRepositories.GetById(ctx, room_id)
	if err != nil {
		return err
	}

	isAdmin, err := r.roomRepositories.IsAdmin(ctx, room_id, userId)
	if err != nil {
		return err
	}

	if !isAdmin {
		return helper.ErrNotAllowed
	}

	// Picture deletion is now handled by handler via storageService

	if roomReq.Picture != nil {
		existRoom.Picture = roomReq.Picture
	}

	if roomReq.Name != nil {
		existRoom.Name = *roomReq.Name
	}

	if roomReq.Description != nil {
		existRoom.Description = roomReq.Description
	}

	existRoom.UpdatedAt = time.Now()

	if err := r.roomRepositories.Update(ctx, room_id, existRoom); err != nil {
		return err
	}

	content := "Room Properties Updated"
	encryptMsg, err := helper.Encrypt(content)
	if err != nil {
		return err
	}

	username := "System"
	if user, ok := r.hub.GetClientById(userId); ok {
		username = user.Username
	}

	updateMsg := dto.Message{
		ID:        dto.GenerateId(),
		RoomID:    room_id,
		UserID:    userId,
		Username:  username,
		Content:   content,
		Type:      "update-room",
		TimeStamp: time.Now(),
	}

	saveMsg := models.Message{
		ID:        updateMsg.ID,
		RoomID:    updateMsg.RoomID,
		UserID:    updateMsg.UserID,
		Username:  updateMsg.Username,
		Content:   encryptMsg,
		Type:      updateMsg.Type,
		CreatedAt: updateMsg.TimeStamp,
	}

	r.roomRepositories.SaveMessage(saveMsg)
	r.hub.Broadcast <- updateMsg

	return nil
}

// Delete implements [core.RoomServices].
func (r *roomServices) Delete(ctx context.Context, room_id string) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}
	_, err := r.roomRepositories.GetById(ctx, room_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Room dengan id %s tidak ditemukan: %w", room_id, err)
		}
		return err
	}

	isAdmin, err := r.roomRepositories.IsAdmin(ctx, room_id, userId)
	if err != nil {
		return err
	}

	if !isAdmin {
		return helper.ErrNotAllowed
	}

	existsMessage, err := r.roomRepositories.GetImageMessageByRoomID(ctx, room_id)
	if err != nil {
		return err
	}

	// hapus exists upload gambar di room
	for _, message := range existsMessage {
		decryptContent, err := helper.Decrypt(message.Content)
		if err != nil {
			return err
		}

		if message.ReplyTo != nil {
			decryptReplyContent, err := helper.Decrypt(message.ReplyTo.Content)
			if err != nil {
				return err
			}

			if err := r.storageServices.RemoveFile("uploads", decryptReplyContent); err != nil {
				log.Printf("failed to remove reply image message :%v", err)
			}
		}

		if err := r.storageServices.RemoveFile("uploads", decryptContent); err != nil {
			log.Printf("failed to remove image message :%v", err)
		}

	}

	if err := r.roomRepositories.Delete(ctx, room_id); err != nil {
		return err
	}

	return nil
}

// IsMember implements [core.RoomServices].
func (r *roomServices) IsMember(room_id string, user_id uint) (bool, error) {
	result, err := r.roomRepositories.IsMember(context.Background(), room_id, user_id)
	if err != nil {
		return false, err
	}

	return result, nil
}

// FindAllStickers implements [core.RoomServices].
func (r *roomServices) FindAllStickers(ctx context.Context, filter string, category string) ([]dto.StickerResponse, error) {
	stickers, err := r.roomRepositories.GetAllStickers(ctx, filter, category)
	if err != nil {
		return nil, err
	}

	var response []dto.StickerResponse

	for _, sticker := range stickers {
		imageUrl := helper.NormalizeImagePath(sticker.Name, r.backendUrl, r.stickersPath)

		response = append(response, dto.StickerResponse{
			ID:       sticker.ID,
			Name:     sticker.Name,
			Url:      imageUrl,
			Category: sticker.Category,
		})
	}

	return response, nil
}

// GetAllRoomMembers implements [core.RoomServices].
func (r *roomServices) GetAllRoomMembers(ctx context.Context, room_id string) ([]dto.RoomMemberResponse, error) {
	_, err := r.roomRepositories.GetById(ctx, room_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("Room dengan id %s tidak ditemukan: %w", room_id, err)
		}
		return nil, err
	}

	rooms, err := r.roomRepositories.GetAllRoomMembers(ctx, room_id)
	if err != nil {
		return nil, err
	}

	var response []dto.RoomMemberResponse

	for _, room := range rooms {
		var userProfilePicture string
		if room.User.ProfilePicture != nil {
			userProfilePicture = helper.NormalizeImagePath(*room.User.ProfilePicture, r.backendUrl, r.usersPath)
		}

		item := dto.RoomMemberResponse{
			UserID:             room.UserID,
			UserProfilePicture: userProfilePicture,
			Username:           room.User.Username,
			UserBio:            room.User.Bio,
			Role:               room.Role,
			IsVerified:         room.User.IsVerified,
			CreatedAt:          room.User.CreatedAt,
		}

		response = append(response, item)
	}

	return response, nil
}

// GetOrCreatePrivateRoom implements [core.RoomServices].
func (r *roomServices) GetPrivateRoom(ctx context.Context, user_id uint, target_id uint) (string, error) {
	roomId, err := r.roomRepositories.GetIdPrivateRoom(ctx, user_id, target_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", fmt.Errorf("room not found")
		}

		return "", err
	}

	return roomId, nil
}

// MakePrivateRoom implements [core.RoomServices].
func (r *roomServices) MakePrivateRoom(ctx context.Context, user_id uint, target_id uint) (string, error) {
	existingRoomID, err := r.roomRepositories.GetIdPrivateRoom(ctx, user_id, target_id)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", err
	}
	if existingRoomID != "" {
		return existingRoomID, nil
	}

	userId := []uint{user_id, target_id}
	newRoom := models.Room{
		ID:        uuid.New().String(),
		OwnerID:   user_id,
		Type:      "private",
		RoomLink:  nil,
		CreatedAt: time.Now(),
	}
	if err := r.roomRepositories.InsertPrivateRoom(ctx, &newRoom, userId); err != nil {
		return "", err
	}
	return newRoom.ID, nil
}

// SendImage implements [core.RoomServices].
func (r *roomServices) SendImage(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	fileName, err := r.storageServices.UploadFile("uploads", fileHeader)
	if err != nil {
		return "", err
	}

	fileUrl := helper.NormalizeImagePath(fileName, r.backendUrl, r.uploadsPath)
	return fileUrl, nil
}

// TakeChatHistory implements [core.RoomServices].
func (r *roomServices) TakeChatHistory(ctx context.Context, room_id string, limit int, lastTimeStamp time.Time) ([]dto.Message, error) {
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

	msgResponse := make([]dto.Message, 0, len(messages))

	for _, msg := range messages {
		decryptedContent, err := helper.Decrypt(msg.Content)
		if err != nil {
			decryptedContent = ""
		}

		decryptedCaption, err := helper.Decrypt(msg.Caption)
		if err != nil {
			decryptedCaption = "Failed to load messages..."
		}

		item := dto.Message{
			ID:             msg.ID,
			RoomID:         msg.RoomID,
			UserID:         msg.UserID,
			Username:       msg.Username,
			Content:        decryptedContent,
			ProfilePicture: msg.ProfilePicture,
			Type:           msg.Type,
			IsRead:         msg.IsRead,
			Caption:        decryptedCaption,
			TimeStamp:      msg.CreatedAt,
		}

		if msg.ReplyTo != nil {
			replyContent, err := helper.Decrypt(msg.ReplyTo.Content)
			if err != nil {
				replyContent = "Failed to load message..."
			}

			replyCaption, err := helper.Decrypt(msg.ReplyTo.Caption)
			if err != nil {
				replyCaption = "Failed to load message..."
			}

			item.ReplyTo = &dto.Message{
				ID:             msg.ReplyTo.ID,
				UserID:         msg.ReplyTo.UserID,
				Username:       msg.ReplyTo.Username,
				ProfilePicture: msg.ReplyTo.ProfilePicture,
				Content:        replyContent,
				Type:           msg.ReplyTo.Type,
				Caption:        replyCaption,
			}
		}
		msgResponse = append(msgResponse, item)
	}

	return msgResponse, nil
}

// TakeMediaMessages implements [core.RoomServices].
func (r *roomServices) TakeMediaMessages(ctx context.Context, roomId string, limit int, cursor time.Time) (*dto.MediaResponse, error) {
	messages, nextCursor, err := r.roomRepositories.GetMediaMessages(ctx, roomId, limit, cursor)
	if err != nil {
		return nil, err
	}

	msgResponse := make([]dto.Message, 0, len(messages))
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

		item := dto.Message{
			ID:             msg.ID,
			RoomID:         msg.RoomID,
			UserID:         msg.UserID,
			Username:       msg.Username,
			Content:        decryptedContent,
			ProfilePicture: msg.ProfilePicture,
			Type:           msg.Type,
			Caption:        decryptedCaption,
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

// KickUser implements [core.RoomServices].
func (r *roomServices) KickUser(ctx context.Context, room_id string, target_id uint) error {
	userId, _ := ctx.Value("user_id").(uint)

	isAdmin, err := r.roomRepositories.IsAdmin(ctx, room_id, userId)
	if err != nil {
		return err
	}

	if !isAdmin {
		return helper.ErrNotAllowed
	}

	if userId == target_id {
		return fmt.Errorf("you cannot kick yourself")
	}

	var targetUsername string
	client, isOnline := r.hub.GetClientById(target_id)
	if isOnline {
		targetUsername = client.Username
	} else {
		// Fetch username dari DB
		targetUser, err := r.userRepositories.GetById(ctx, target_id)
		if err == nil {
			targetUsername = targetUser.Name
		}
	}

	msgContent := targetUsername + " has been kicked"
	encryptMsg, err := helper.Encrypt(msgContent)
	if err != nil {
		return err
	}

	kickMsg := dto.Message{
		ID:        dto.GenerateId(),
		RoomID:    room_id,
		UserID:    target_id,
		Username:  targetUsername,
		Type:      "leave",
		Content:   msgContent,
		TimeStamp: time.Now(),
	}

	saveMsg := models.Message{
		ID:        kickMsg.ID,
		RoomID:    kickMsg.RoomID,
		UserID:    kickMsg.UserID,
		Username:  kickMsg.Username,
		Type:      kickMsg.Type,
		Content:   encryptMsg,
		CreatedAt: kickMsg.TimeStamp,
	}

	r.roomRepositories.SaveMessage(saveMsg)
	r.hub.Broadcast <- kickMsg

	if err := r.roomRepositories.DeleteUser(ctx, room_id, target_id); err != nil {
		return err
	}

	return nil
}

// RemoveMessage implements [core.RoomServices].
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
		if replyMsg.Type == "image" && replyMsg.Content != "" {
			decryptContent, err := helper.Decrypt(replyMsg.Content)
			if err != nil {
				return err
			}

			if err := r.storageServices.RemoveFile("uploads", decryptContent); err != nil {
				log.Printf("failed to remove reply image message :%v", err)
			}
		}
	}

	if existsMsg.Type == "image" && existsMsg.Content != "" {
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

	removeMsg := dto.Message{
		ID:              dto.GenerateId(),
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

// RemoveMultipleMessage implements [core.RoomServices].
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

		removeMsg := dto.Message{
			ID:              dto.GenerateId(),
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

// JoinRoom implements [core.RoomServices].
func (r *roomServices) JoinRoom(ctx context.Context, room_id string) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	isAlreadyMember, err := r.roomRepositories.IsMember(ctx, room_id, userId)
	if err != nil {
		return err
	}

	if isAlreadyMember {
		return errors.New("You have joined this group")
	}

	newMember := models.RoomMember{
		RoomID:   room_id,
		UserID:   userId,
		Role:     "member",
		JoinedAt: time.Now(),
	}

	if err := r.roomRepositories.InsertRoomMembers(ctx, &newMember); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Failed add member: %w", err)
		}
		return err
	}

	var targetUsername string
	client, isOnline := r.hub.GetClientById(userId)
	if isOnline {
		targetUsername = client.Username
	} else {
		// Fetch username dari DB
		targetUser, err := r.userRepositories.GetById(ctx, userId)
		if err == nil {
			targetUsername = targetUser.Name
		}
	}

	msgContent := targetUsername + " joined the chat"
	encryptMsg, err := helper.Encrypt(msgContent)
	if err != nil {
		return err
	}

	joinMsg := dto.Message{
		ID:        dto.GenerateId(),
		RoomID:    room_id,
		UserID:    userId,
		Username:  targetUsername,
		Type:      "join",
		Content:   msgContent,
		TimeStamp: time.Now(),
	}

	saveMsg := models.Message{
		ID:        joinMsg.ID,
		RoomID:    joinMsg.RoomID,
		UserID:    joinMsg.UserID,
		Username:  joinMsg.Username,
		Type:      joinMsg.Type,
		Content:   encryptMsg,
		CreatedAt: joinMsg.TimeStamp,
	}

	r.roomRepositories.SaveMessage(saveMsg)
	r.hub.Broadcast <- joinMsg

	return nil
}

// AddMember implements [core.RoomServices].
func (r *roomServices) AddMember(ctx context.Context, room_id string, target_id uint) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	isAlreadyMember, err := r.roomRepositories.IsMember(ctx, room_id, target_id)
	if err != nil {
		return err
	}

	if isAlreadyMember {
		return errors.New("kamu sudah bergabung di grup ini")
	}

	isAdmin, err := r.roomRepositories.IsAdmin(ctx, room_id, userId)
	if err != nil {
		return err
	}

	if !isAdmin {
		return helper.ErrNotAllowed
	}

	isFriend, err := r.userRepositories.GetFriendship(ctx, userId, target_id)
	if err != nil {
		return err
	}

	if !isFriend {
		return fmt.Errorf("You can't add members if they're not friends.")
	}

	newMember := models.RoomMember{
		RoomID:   room_id,
		UserID:   target_id,
		Role:     "member",
		JoinedAt: time.Now(),
	}

	if err := r.roomRepositories.InsertRoomMembers(ctx, &newMember); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Gagal memasukan memeber: %w", err)
		}
		return err
	}

	var targetUsername string
	client, isOnline := r.hub.GetClientById(target_id)
	if isOnline {
		targetUsername = client.Username
	} else {
		// Fetch username dari DB
		targetUser, err := r.userRepositories.GetById(ctx, target_id)
		if err == nil {
			targetUsername = targetUser.Name
		}
	}

	msgContent := targetUsername + " joined the chat"
	encryptMsg, err := helper.Encrypt(msgContent)
	if err != nil {
		return err
	}

	joinMsg := dto.Message{
		ID:        dto.GenerateId(),
		RoomID:    room_id,
		UserID:    target_id,
		Username:  targetUsername,
		Type:      "join",
		Content:   msgContent,
		TimeStamp: time.Now(),
	}

	notifMsg := dto.Message{
		ID:        joinMsg.ID,
		RoomID:    joinMsg.RoomID,
		UserID:    joinMsg.UserID,
		ToID:      target_id,
		Username:  joinMsg.Username,
		Type:      "added-to-room",
		Content:   joinMsg.Content,
		TimeStamp: joinMsg.TimeStamp,
	}

	saveMsg := models.Message{
		ID:        joinMsg.ID,
		RoomID:    joinMsg.RoomID,
		UserID:    joinMsg.UserID,
		Username:  joinMsg.Username,
		Type:      joinMsg.Type,
		Content:   encryptMsg,
		CreatedAt: joinMsg.TimeStamp,
	}

	r.roomRepositories.SaveMessage(saveMsg)
	r.hub.Broadcast <- joinMsg
	r.hub.Signal <- notifMsg

	return nil
}

// MakeAdmin implements [core.RoomServices].
func (r *roomServices) MakeAdmin(ctx context.Context, room_id string, target_id uint) error {
	user_id := ctx.Value("user_id").(uint)
	isAdmin, err := r.roomRepositories.IsAdmin(ctx, room_id, user_id)
	if err != nil {
		return err
	}

	if !isAdmin {
		return helper.ErrNotAllowed
	}

	if isAdmin {
		if err := r.roomRepositories.UpdateToAdmin(ctx, room_id, target_id); err != nil {
			return err
		}
	}

	return nil
}

// UpdateLastReadMessages implements [core.RoomServices].
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

	if err := r.roomRepositories.UpdateReadMessages(ctx, room_id, userId, time.Now()); err != nil {
		return err
	}

	if err := r.roomRepositories.MarkMessageRead(ctx, room_id, userId); err != nil {
		return err
	}

	r.hub.Broadcast <- dto.Message{
		RoomID: room_id,
		UserID: userId,
		Type:   "readed",
	}

	return nil
}

// UpdateMessage implements [core.RoomServices].
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

	updateMsg := dto.Message{
		ID:              dto.GenerateId(),
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

// LeaveRoom implements [core.RoomServices].
func (r *roomServices) LeaveRoom(ctx context.Context, room_id string) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	if err := r.roomRepositories.DeleteUser(ctx, room_id, userId); err != nil {
		return err
	}

	var targetUsername string
	client, isOnline := r.hub.GetClientById(userId)
	if isOnline {
		targetUsername = client.Username
	} else {
		targetUser, err := r.userRepositories.GetById(ctx, userId)
		if err == nil {
			targetUsername = targetUser.Name
		}
	}

	msgContent := targetUsername + " has leave the chat"
	encryptMsg, err := helper.Encrypt(msgContent)
	if err != nil {
		return err
	}

	leaveMsg := dto.Message{
		ID:        dto.GenerateId(),
		RoomID:    room_id,
		UserID:    userId,
		Username:  targetUsername,
		Type:      "leave",
		Content:   msgContent,
		TimeStamp: time.Now(),
	}

	saveMsg := models.Message{
		ID:        leaveMsg.ID,
		RoomID:    leaveMsg.RoomID,
		UserID:    leaveMsg.UserID,
		Username:  leaveMsg.Username,
		Type:      leaveMsg.Type,
		Content:   encryptMsg,
		CreatedAt: leaveMsg.TimeStamp,
	}

	r.roomRepositories.SaveMessage(saveMsg)
	r.hub.Broadcast <- leaveMsg

	return nil
}

// FindMutualRooms implements [core.RoomServices].
func (r *roomServices) FindMutualRooms(ctx context.Context, target_id uint) ([]dto.RoomResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	rooms, err := r.roomRepositories.GetMutualRooms(ctx, userId, target_id)
	if err != nil {
		return nil, err
	}

	var response []dto.RoomResponse
	for _, room := range rooms {
		var picture string
		if room.Picture != nil {
			picture = helper.NormalizeImagePath(*room.Picture, r.backendUrl, r.roomsPath)
		}

		roomLink := fmt.Sprintf("%s/%s", r.frontendJoinUrl, room.RoomLink)

		item := dto.RoomResponse{
			ID:          room.ID,
			Picture:     &picture,
			Name:        room.Name,
			Description: room.Description,
			RoomLink:    roomLink,
			Type:        room.Type,
			CreatedAt:   room.CreatedAt,
			UpdatedAt:   room.UpdatedAt,
		}

		response = append(response, item)
	}

	return response, nil
}

// GetMessageByID implements [core.RoomServices].
func (r *roomServices) FindMessageByID(ctx context.Context, message_id string) (*dto.Message, error) {
	message, err := r.roomRepositories.GetMessageByID(ctx, message_id)
	if err != nil {
		return nil, err
	}

	decrypt, err := helper.Decrypt(message.Content)
	if err == nil {
		message.Content = decrypt
	}

	response := dto.Message{
		ID:       message.ID,
		RoomID:   message.RoomID,
		UserID:   message.UserID,
		Username: message.Username,
		Content:  message.Content,
		Type:     message.Type,
	}

	return &response, nil
}

// GetActiveMemberCount implements [core.RoomServices].
func (r *roomServices) GetActiveMemberCount(ctx context.Context, room_id string) (int64, error) {
	_, err := r.roomRepositories.GetById(ctx, room_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, fmt.Errorf("Room id not found: %w", err)
		}
		return 0, err
	}

	activeMember, err := r.hub.GetActiveMemberCount(room_id)
	if err != nil {
		return 0, err
	}

	return activeMember, nil
}

// GetActiveMembers implements [core.RoomServices].
func (r *roomServices) GetActiveMembers(room_id string) ([]uint, error) {
	members, err := r.roomRepositories.GetAllRoomMembers(context.Background(), room_id)
	if err != nil {
		return nil, err
	}

	var activeMembers []uint

	for _, member := range members {
		if r.hub.IsOnline(member.UserID) {
			activeMembers = append(activeMembers, member.UserID)
		}
	}

	return activeMembers, nil
}

// GetAllRoomMembersByUserId implements [core.RoomServices].
func (r *roomServices) GetAllRoomMembersByUserId(ctx context.Context, user_id uint) ([]uint, error) {
	members, err := r.roomRepositories.GetAllRoomMembersByUserId(ctx, user_id)
	if err != nil {
		return nil, err
	}

	return members, nil
}

// OnlineUsers implements [core.RoomServices].
func (r *roomServices) OnlineUsers(ctx context.Context, room_id string) ([]uint, error) {
	members, err := r.roomRepositories.GetAllRoomMembers(ctx, room_id)
	if err != nil {
		return nil, err
	}

	var activeUsers []uint

	for _, member := range members {
		if r.hub.IsOnline(member.UserID) {
			activeUsers = append(activeUsers, member.UserID)
		}
	}

	return activeUsers, nil
}

// GetMemberCount implements [core.RoomServices].
func (r *roomServices) GetMemberCount(ctx context.Context, room_id string) (int64, error) {
	_, err := r.roomRepositories.GetById(ctx, room_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, fmt.Errorf("Room id not found: %w", err)
		}
		return 0, err
	}

	memberCount, err := r.roomRepositories.GetMemberCount(ctx, room_id)
	if err != nil {
		return 0, err
	}

	return memberCount, nil
}

// SaveMessage implements [core.RoomServices].
func (r *roomServices) SaveMessage(msg dto.Message) error {
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
