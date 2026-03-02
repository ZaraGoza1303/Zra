package core

import (
	"chatapp/dto"
	"chatapp/internal/models"
	"context"
)

type UserRepositories interface {
	GetAll(ctx context.Context, filter string) ([]models.User, error)
	GetById(ctx context.Context, id uint) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByToken(ctx context.Context, token string) (*models.User, error)
	GetByPassResetToken(ctx context.Context, token string) (*models.PasswordReset, error)
	GetByEmailAndProvider(ctx context.Context, email, provider string) (*models.User, error)
	Update(ctx context.Context, id uint, req *models.User) error
	UpdatePassResetToken(ctx context.Context, reset *models.PasswordReset) error
	Delete(ctx context.Context, id uint) error
	DeleteResetToken(ctx context.Context, token string) error

	VerifyEmail(ctx context.Context, id uint, req *models.User) error
}

type UserServices interface {
	FindAll(ctx context.Context, filter string) ([]dto.UserResponse, error)
	FindById(ctx context.Context, id uint) (*dto.UserResponse, error)
	FindByEmail(ctx context.Context, email string) (*dto.UserResponse, error)
	FindByToken(ctx context.Context, token string) (*dto.UserResponse, error)
	FindByEmailAndProvider(ctx context.Context, email, provider string) (*dto.UserResponse, error)
	Update(ctx context.Context, id uint, req *dto.UpdateUserRequest) (*models.User, error)
	UpdatePassResetToken(ctx context.Context, id uint, req dto.UpdatePassResetTokenRequest) error
	Delete(ctx context.Context, id uint) error
	ChangePassword(ctx context.Context, id uint, req dto.ChangePasswordRequest) error
	ExecuteReset(ctx context.Context, token string, req dto.ResetPasswordRequest) error

	//For Websocket
	FindByIdWithoutCtx(id uint) (*dto.UserResponse, error)
}
