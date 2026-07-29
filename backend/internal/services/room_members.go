package services

import (
	"chatapp/hub"
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (r *roomServices) IsMember(room_id string, user_id uint) (bool, error) {
	result, err := r.roomRepositories.IsMember(context.Background(), room_id, user_id)
	if err != nil {
		return false, err
	}

	return result, nil
}
func (r *roomServices) GetAllRoomMembers(ctx context.Context, room_id string) ([]dto.RoomMemberResponse, error) {
	userId, _ := ctx.Value("user_id").(uint)

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

		var lastSeenAt *time.Time
		if room.UserID == userId {
			lastSeenAt = room.User.LastSeenAt
		} else {
			settings, err := r.userServices.GetSettingsByUserId(room.UserID)
			if err != nil {
				return nil, err
			}

			switch settings.LastSeen {
			case "everyone":
				lastSeenAt = room.User.LastSeenAt
			case "friends":
				isFriend, _ := r.userRepositories.GetFriendship(context.Background(), room.UserID, userId)
				if isFriend {
					lastSeenAt = room.User.LastSeenAt
				}
				lastSeenAt = nil
			default:
				lastSeenAt = nil
			}
		}

		item := dto.RoomMemberResponse{
			UserID:             room.UserID,
			UserProfilePicture: userProfilePicture,
			Username:           room.User.Username,
			UserBio:            room.User.Bio,
			Role:               room.Role,
			LastSeenAt:         lastSeenAt,
			IsVerified:         room.User.IsVerified,
			CreatedAt:          room.User.CreatedAt,
		}

		response = append(response, item)
	}

	return response, nil
}
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

	kickMsg := hub.Message{
		ID:        hub.GenerateId(),
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

	joinMsg := hub.Message{
		ID:        hub.GenerateId(),
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

	joinMsg := hub.Message{
		ID:        hub.GenerateId(),
		RoomID:    room_id,
		UserID:    target_id,
		Username:  targetUsername,
		Type:      "join",
		Content:   msgContent,
		TimeStamp: time.Now(),
	}

	notifMsg := hub.Message{
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

	leaveMsg := hub.Message{
		ID:        hub.GenerateId(),
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

		roomLink := ""
		if room.RoomLink != nil {
			roomLink = fmt.Sprintf("%s/%s", r.frontendJoinUrl, *room.RoomLink)
		}

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
