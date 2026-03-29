package dto

import "time"

type UserRegisterRequest struct {
	Email           string `json:"email" validate:"required"`
	Username        string `json:"username" validate:"required"`
	Name            string `json:"name" validate:"required"`
	Password        string `json:"password" validate:"required"`
	ConfirmPassword string `json:"confirm_password" validate:"required"`
}

type UserRegisterResponse struct {
	Email    string `json:"email" `
	Username string `json:"username" `
	Password string `json:"password" `
	Notes    string `json:"notes"`
}

type VerifyEmailOTPRequest struct {
	Email string `json:"email" validate:"required,email"`
	OTP   string `json:"otp" validate:"required"`
}

type UserLoginRequest struct {
	Email      string `json:"email" validate:"required"`
	Password   string `json:"password" validate:"required"`
	RememberMe bool   `json:"remember_me"`
}

type UserLoginResponse struct {
	Username       string `json:"username"`
	Name           string `json:"name"`
	Email          string `json:"email"`
	Bio            string `json:"bio"`
	ProfilePicture string `json:"profile_picture"`
	AccessToken    string `json:"access_token"`
	RefreshToken   string `json:"refresh_token"`
	CreatedAt      string `json:"created_at"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type LoginProviderResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type LogoutRequest struct {
	UserID       uint   `json:"user_id" validate:"required"`
	RefreshToken string `json:"refresh_token" validate:"required"`
	AccessUUID   string
	RefreshUUID  string
}

type ResetPasswordRequest struct {
	Token           string `json:"token"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

type UpdatePassResetTokenRequest struct {
	UserID    uint      `json:"user_id"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type RefreshTokenClaimsRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
	UserID       uint   `json:"user_id"`
	AccessUUID   string `json:"access_uuid"`
	RefreshUUID  string `json:"refresh_uuid"`
	IsPersistent bool   `json:"is_persistent"`
}

type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type GenerateJwtRequest struct {
	UserID          uint
	JwtAccessKey    string
	JwtRefreshKey   string
	AccessDuration  time.Duration
	RefreshDuration time.Duration
	IsPersistent    bool
}

type GenerateJwtResponse struct {
	SignedAccessKey  string
	SignedRefreshKey string
	AccessUUID       string
	RefreshUUID      string
}

type InsertRefreshRequest struct {
	UserID          uint
	RefreshToken    string
	RefreshUUID     string
	AccessUUID      string
	AccessDuration  time.Duration
	RefreshDuration time.Duration
}

type UpdateRefreshRequest struct {
	UserID          uint
	OldRefreshToken string
	OldRefreshUUID  string
	NewRefreshToken string
	NewRefreshUUID  string
	OldAccessUUID   string
	NewAccessUUID   string
	AccessDuration  time.Duration
	RefreshDuration time.Duration
}
