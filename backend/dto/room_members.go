package dto

type RoomMemberRequest struct {
	RoomID string `form:"room_id" json:"room_id"`
	UserID uint   `form:"user_id" json:"user_id"`
	Role   string `form:"role" json:"role"`
}

type RoomMemberResponse struct {
	UserID             uint   `json:"user_id"`
	UserProfilePicture string `json:"user_profile_picture"`
	Username           string `json:"username"`
	UserBio            string `json:"user_bio"`
	Role               string `json:"role"`
}
