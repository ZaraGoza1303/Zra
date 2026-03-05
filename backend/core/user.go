package core

import (
	"chatapp/dto"
	"chatapp/internal/models"
	"context"
)

type UserRepositories interface {
	GetAll(ctx context.Context, filter string) ([]models.User, error)
	GetByUsername(ctx context.Context, username string) (*models.User, error)
	GetById(ctx context.Context, id uint) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByToken(ctx context.Context, token string) (*models.User, error)
	GetByPassResetToken(ctx context.Context, token string) (*models.PasswordReset, error)
	GetByEmailAndProvider(ctx context.Context, email, provider string) (*models.User, error)
	GetListFriend(ctx context.Context, filter string, user_id uint) ([]models.Friend, error)
	GetListFriendRequest(ctx context.Context, filter string, user_id uint) ([]models.Friend, error)
	GetFriendship(ctx context.Context, user_id uint, target_id uint) (bool, error)
	InsertFriendRequest(ctx context.Context, req *models.Friend) error
	Update(ctx context.Context, id uint, req *models.User) error
	UpdateFriendRequest(ctx context.Context, req *models.Friend) error
	UpdatePassResetToken(ctx context.Context, reset *models.PasswordReset) error
	Delete(ctx context.Context, id uint) error
	DeleteFriendRequest(ctx context.Context, user_id uint, target_id uint) error
	DeleteFriendship(ctx context.Context, user_id uint, target_id uint) error
	DeleteResetToken(ctx context.Context, token string) error

	VerifyEmail(ctx context.Context, id uint, req *models.User) error
}

type UserServices interface {
	FindAll(ctx context.Context, filter string) ([]dto.UserResponse, error)
	FindByUsername(ctx context.Context, username string) (*dto.UserResponse, error)
	FindById(ctx context.Context, id uint) (*dto.UserResponse, error)
	FindByEmail(ctx context.Context, email string) (*dto.UserResponse, error)
	FindByToken(ctx context.Context, token string) (*dto.UserResponse, error)
	FindByEmailAndProvider(ctx context.Context, email, provider string) (*dto.UserResponse, error)
	FindListFriend(ctx context.Context, filter string) ([]dto.UserResponse, error)
	FindListFriendRequest(ctx context.Context, filter string) ([]dto.UserResponse, error)
	MakeFriendRequest(ctx context.Context, target_id uint) error
	Update(ctx context.Context, id uint, req *dto.UpdateUserRequest) (*models.User, error)
	UpdateFriendRequest(ctx context.Context, target_id uint) error
	UpdatePassResetToken(ctx context.Context, id uint, req dto.UpdatePassResetTokenRequest) error
	Delete(ctx context.Context, id uint) error
	Unfriend(ctx context.Context, target_id uint) error
	RejectFriendRequest(ctx context.Context, target_id uint) error
	ChangePassword(ctx context.Context, id uint, req dto.ChangePasswordRequest) error
	ExecuteReset(ctx context.Context, token string, req dto.ResetPasswordRequest) error

	//For Websocket
	FindByIdWithoutCtx(id uint) (*dto.UserResponse, error)
}
