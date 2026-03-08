package dto

import (
	"time"
)

// type RoomBaseResponse[T any] struct {
// 	Success bool   `json:"success"`
// 	Message string `json:"message"`
// }

type RoomResponse struct {
	ID            string               `json:"id"`
	OwnerID       uint                 `json:"owner_id"`
	Picture       *string              `json:"picture"`
	Name          string               `json:"name"`
	Description   *string              `json:"description"`
	RoomLink      string               `json:"room_link"`
	Type          string               `json:"type"`
	Members       []RoomMemberResponse `json:"members"`
	CreatedAt     time.Time            `json:"created_at"`
	UpdatedAt     time.Time            `json:"updated_at"`
	LastMessage   LastMessageInfo      `json:"last_message"`
	UnreadMessage int64                `json:"unread_message"`
}

type RoomCreateRequest struct {
	ID          string  `form:"id" json:"id" validate:"required"`
	OwnerID     uint    `form:"owner_id" json:"owner_id" validate:"required"`
	Picture     *string `json:"picture"`
	Name        string  `form:"name" json:"name"`
	Description *string `form:"description" json:"description"`
}

type RoomUpdateRequest struct {
	Picture     *string `json:"picture"`
	Name        *string `form:"name" json:"name"`
	Description *string `form:"description" json:"description"`
}

type LastMessageInfo struct {
	Content  string    `json:"content"`
	Username string    `json:"username"`
	SentAt   time.Time `json:"sent_at"`
}
