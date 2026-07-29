package services

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

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
func (r *roomServices) GetAllRoomMembersByUserId(ctx context.Context, user_id uint) ([]uint, error) {
	members, err := r.roomRepositories.GetAllRoomMembersByUserId(ctx, user_id)
	if err != nil {
		return nil, err
	}

	return members, nil
}
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
