package core

import (
	"chatapp/dto"
	"chatapp/internal/models"
	"context"

	"github.com/markbates/goth"
)

type AuthRepositories interface {
	Register(ctx context.Context, user *models.User) error
	Login(ctx context.Context, email string, password string) (*models.User, error)
	SelectRefreshToken(ctx context.Context, token string, refreshUUID string) (bool, error)
	UpdateRefreshToken(ctx context.Context, req dto.UpdateRefreshRequest) error
	InsertRefreshToken(ctx context.Context, req dto.InsertRefreshRequest) error
	DeleteRefreshToken(ctx context.Context, userID uint, token, accessUUID, refreshUUID string) error
}

type AuthServices interface {
	Register(ctx context.Context, req dto.UserRegisterRequest) (*dto.UserRegisterResponse, error)
	Login(ctx context.Context, req dto.UserLoginRequest) (*dto.UserLoginResponse, error)
	LoginProvider(ctx context.Context, req goth.User, rememberMe bool) (*dto.LoginProviderResponse, error)
	ForgotPassword(ctx context.Context, req dto.ForgotPasswordRequest) (string, error)
	VerifyEmail(ctx context.Context, req dto.VerifyEmailOTPRequest) error
	Logout(ctx context.Context, req dto.LogoutRequest) error
	Refresh(ctx context.Context, req dto.RefreshTokenClaimsRequest) (*dto.RefreshResponse, error)
}
