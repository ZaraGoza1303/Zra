package dto

import "time"

type RoomMemberRequest struct {
	RoomID string `form:"room_id" json:"room_id" validate:"required"`
	UserID uint   `form:"user_id" json:"user_id" validate:"required"`
	Role   string `form:"role" json:"role" validate:"required"`
}

type RoomMemberResponse struct {
	UserID             uint      `json:"user_id"`
	UserProfilePicture string    `json:"user_profile_picture"`
	Username           string    `json:"username"`
	UserBio            string    `json:"user_bio"`
	Role               string    `json:"role"`
	LastReadAt         time.Time `json:"last_read_at"`
}
