package services

import (
	"chatapp/core"
	"chatapp/hub"
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)


type roomServices struct {
	hub              *hub.Hub
	roomRepositories core.RoomRepositories
	userRepositories core.UserRepositories
	userServices     core.UserServices
	storageServices  core.StorageService
	frontendUrl      string
	backendUrl       string
	frontendJoinUrl  string
	roomsPath        string
	usersPath        string
	stickersPath     string
	uploadsPath      string
}

func NewRoomServices(hub *hub.Hub, roomRepo core.RoomRepositories, userRepo core.UserRepositories, userServices core.UserServices, storageServices core.StorageService) core.RoomServices {
	return &roomServices{
		hub:              hub,
		roomRepositories: roomRepo,
		userRepositories: userRepo,
		userServices:     userServices,
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

	updateMsg := hub.Message{
		ID:        hub.GenerateId(),
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

	existsMessage, err := r.roomRepositories.GetUploadMessageByRoomID(ctx, room_id)
	if err != nil {
		return err
	}

	// hapus exists upload files di room
	for _, message := range existsMessage {

		if message.ReplyTo != nil && (message.ReplyTo.Type == "image" || message.ReplyTo.Type == "file") {
			decryptReplyContent, err := helper.Decrypt(message.ReplyTo.Content)
			if err != nil {
				log.Printf("failed to decrypt reply message content :%v", err)
			}

			if err := r.storageServices.RemoveFile("uploads", decryptReplyContent); err != nil {
				log.Printf("failed to remove reply image message :%v", err)
			}
		}

		if message.Type == "image" || message.Type == "file" {
			decryptContent, err := helper.Decrypt(message.Content)
			if err != nil {
				log.Printf("failed to decrypt image message content :%v", err)
			}

			if err := r.storageServices.RemoveFile("uploads", decryptContent); err != nil {
				log.Printf("failed to remove image message :%v", err)
			}
		}
	}

	if err := r.roomRepositories.Delete(ctx, room_id); err != nil {
		return err
	}

	return nil
}
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
