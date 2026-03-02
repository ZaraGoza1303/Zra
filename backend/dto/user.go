package dto

import "time"

type UserResponse struct {
	ID                 uint      `json:"id"`
	ProfilePicture     string    `json:"profile_picture"`
	Email              string    `json:"email"`
	Bio                string    `json:"bio"`
	Provider           string    `json:"provider"`
	Name               string    `json:"name"`
	IsVerified         bool      `json:"is_verified"`
	VerifyToken        string    `json:"-"`
	PasswordResetToken string    `json:"password_reset_token"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type UpdateUserRequest struct {
	ID             uint    `form:"id" json:"id" validate:"required"`
	ProfilePicture *string `form:"profile_picture" json:"profile_picture"`
	Bio            *string `form:"bio" json:"bio"`
	Name           *string `form:"name" json:"name"`
	Password       *string `form:"password" json:"password"`
}

type UpdateUserResponse struct {
	ID             uint      `json:"id"`
	ProfilePicture string    `json:"profile_picture"`
	Email          string    `json:"email"`
	Bio            string    `json:"bio"`
	Name           string    `json:"name"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ChangePasswordRequest struct {
	UserId          uint   `json:"user_id"`
	OldPassword     string `json:"old_password"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}
