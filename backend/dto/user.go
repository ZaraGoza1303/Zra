package dto

import (
	"time"
)

type UserResponse struct {
	ID                 uint      `json:"id"`
	ProfilePicture     string    `json:"profile_picture"`
	Email              string    `json:"email"`
	Bio                string    `json:"bio"`
	Provider           string    `json:"provider"`
	Username           string    `json:"username"`
	Name               string    `json:"name"`
	IsVerified         bool      `json:"is_verified"`
	VerifyToken        string    `json:"-"`
	PasswordResetToken string    `json:"password_reset_token"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type UpdateUserRequest struct {
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
	OldPassword     string `json:"old_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required"`
	ConfirmPassword string `json:"confirm_password" validate:"required"`
}

type CreateSocialLinksRequest struct {
	Link []CreateLinkRequest `json:"link" validate:"required"`
}

type CreateLinkRequest struct {
	Type string `json:"type" validate:"required"`
	Url  string `json:"url" validate:"required"`
}

type UpdateSocialLinkRequest struct {
	Type string `json:"type"`
	Url  string `json:"url"`
}

type SocialLinkResponse struct {
	ID   uint   `json:"id"`
	Type string `json:"type"`
	Url  string `json:"url"`
}
