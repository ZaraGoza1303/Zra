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
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type roomServices struct {
	hub              *dto.Hub
	roomRepositories core.RoomRepositories
	frontendUrl      string
	backendUrl       string
	frontendJoinUrl  string
	roomsPath        string
	usersPath        string
}

func NewRoomServices(hub *dto.Hub, roomRepo core.RoomRepositories) core.RoomServices {
	return &roomServices{
		hub:              hub,
		roomRepositories: roomRepo,
		frontendUrl:      os.Getenv("FRONTEND_URL"),
		backendUrl:       os.Getenv("BACKEND_URL"),
		frontendJoinUrl:  os.Getenv("FRONTEND_JOIN_URL"),
		roomsPath:        os.Getenv("ROOMS_PATH"),
		usersPath:        os.Getenv("USERS_PATH"),
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

	var response []dto.RoomResponse
	for _, room := range rooms {
		var picture string
		if room.Picture != nil {
			picture = fmt.Sprintf("%s%s%s", r.backendUrl, r.roomsPath, *room.Picture)
		}

		roomLink := fmt.Sprintf("%s/%s", r.frontendJoinUrl, room.RoomLink)

		item := dto.RoomResponse{
			ID:          room.ID,
			Picture:     &picture,
			Name:        room.Name,
			Description: room.Description,
			RoomLink:    roomLink,
			CreatedAt:   room.CreatedAt,
			UpdatedAt:   room.UpdatedAt,
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
		picture = fmt.Sprintf("%s%s%s", r.backendUrl, r.roomsPath, *room.Picture)
	}

	roomLink := fmt.Sprintf("%s/%s", r.frontendJoinUrl, room.RoomLink)

	response := dto.RoomResponse{
		ID:          room.ID,
		Picture:     &picture,
		Name:        room.Name,
		Description: room.Description,
		RoomLink:    roomLink,
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
		picture = fmt.Sprintf("%s%s%s", r.backendUrl, r.roomsPath, *room.Picture)
	}

	roomLink := fmt.Sprintf("%s/%s", r.frontendJoinUrl, room.RoomLink)

	response := dto.RoomResponse{
		ID:          room.ID,
		Picture:     &picture,
		Name:        room.Name,
		Description: room.Description,
		RoomLink:    roomLink,
		CreatedAt:   room.CreatedAt,
		UpdatedAt:   room.UpdatedAt,
	}

	return &response, nil
}

// CreateRoom implements [core.RoomServices].
func (r *roomServices) CreateRoom(ctx context.Context, room dto.RoomCreateRequest) error {
	roomLink := uuid.New().String()

	newRoom := models.Room{
		ID:        room.ID,
		OwnerID:   room.OwnerID,
		Name:      room.Name,
		RoomLink:  roomLink,
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

	if existRoom.Picture != nil {
		fullPath := fmt.Sprintf(".%s%s", r.roomsPath, *existRoom.Picture)
		if _, err := os.Stat(fullPath); err == nil {
			_ = os.Remove(fullPath)
		}
	}

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
			userProfilePicture = fmt.Sprintf("%s%s%s", r.backendUrl, r.usersPath, *room.User.ProfilePicture)
		}

		item := dto.RoomMemberResponse{
			UserID:             room.UserID,
			UserProfilePicture: userProfilePicture,
			Username:           room.User.Name,
			UserBio:            room.User.Bio,
			Role:               room.Role,
		}

		response = append(response, item)
	}

	return response, nil
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

	if err := r.roomRepositories.DeleteUser(ctx, room_id, target_id); err != nil {
		return err
	}

	r.hub.RemoveUserFromRoom(room_id, target_id)

	return nil
}

// JoinRoom implements [core.RoomServices].
func (r *roomServices) JoinRoom(ctx context.Context, member *dto.RoomMemberRequest) error {
	isAlreadyMember, err := r.roomRepositories.IsMember(ctx, member.RoomID, member.UserID)
	if err != nil {
		return err
	}

	if isAlreadyMember {
		return errors.New("kamu sudah bergabung di grup ini")
	}

	newMember := models.RoomMember{
		RoomID:   member.RoomID,
		UserID:   member.UserID,
		Role:     member.Role,
		JoinedAt: time.Now(),
	}

	if err := r.roomRepositories.InsertRoomMembers(ctx, &newMember); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Gagal memasukan memeber: %w", err)
		}
		return err
	}

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
		return fmt.Errorf("Role is already admin!")
	}

	if err := r.roomRepositories.UpdateToAdmin(ctx, room_id, target_id); err != nil {
		return err
	}

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

	r.hub.RemoveUserFromRoom(room_id, userId)

	return nil
}

// SaveMessage implements [core.RoomServices].
func (r *roomServices) SaveMessage(msg dto.Message) error {
	message := models.Message{
		ID:        msg.ID,
		RoomID:    msg.RoomID,
		UserID:    msg.UserID,
		Username:  msg.Username,
		Content:   msg.Content,
		Type:      msg.Type,
		CreatedAt: time.Now(),
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
