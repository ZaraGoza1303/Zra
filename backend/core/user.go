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
	GetListFriend(ctx context.Context, filter string, user_id uint) ([]models.User, error)
	GetListFriendRequest(ctx context.Context, filter string, user_id uint) ([]models.User, error)
	GetUnreadNotifCount(ctx context.Context, user_id uint) ([]dto.UnreadNotifResponse, error)
	GetFriendship(ctx context.Context, user_id uint, target_id uint) (bool, error)
	GetLinks(ctx context.Context, userId uint) ([]models.Link, error)
	GetSocialLinkByUserId(ctx context.Context, userId uint) (*models.SocialLink, error)
	InsertFriendRequest(ctx context.Context, req *models.Friend) error
	InsertNotification(ctx context.Context, req *models.Notification) error
	InsertSocialLink(ctx context.Context, req *models.SocialLink) error
	InsertLink(ctx context.Context, req []models.Link) error
	Update(ctx context.Context, id uint, req *models.User) error
	UpdateFriendRequest(ctx context.Context, req *models.Friend) error
	UpdatePassResetToken(ctx context.Context, reset *models.PasswordReset) error
	UpdateNotifRead(ctx context.Context, user_id uint) error
	UpdateSocialLink(ctx context.Context, linkId uint, req *models.Link) error
	Delete(ctx context.Context, id uint) error
	DeleteFriendRequest(ctx context.Context, user_id uint, target_id uint) error
	DeleteFriendship(ctx context.Context, user_id uint, target_id uint) error
	DeleteResetToken(ctx context.Context, token string) error
	DeleteExpiredRefreshToken(ctx context.Context) error
	DeleteExpiredResetToken(ctx context.Context) error
	DeleteReadedNotifications(ctx context.Context) error
	DeleteSocialLink(ctx context.Context, linkId uint) error

	IsLinkOwnedByUser(ctx context.Context, userId uint, linkId uint) (bool, error)
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
	FindUnreadNotifCount(ctx context.Context) ([]dto.UnreadNotifResponse, error)
	FindSocialLinks(ctx context.Context) ([]dto.SocialLinkResponse, error)
	FindSocialLinksById(ctx context.Context, userId uint) ([]dto.SocialLinkResponse, error)
	MakeFriendRequest(ctx context.Context, target_id uint) error
	CreateSocialLinks(ctx context.Context, req *dto.CreateSocialLinksRequest) error
	Update(ctx context.Context, req *dto.UpdateUserRequest) (*models.User, error)
	UpdateFriendRequest(ctx context.Context, target_id uint) error
	UpdateReadNotifications(ctx context.Context) error
	UpdatePassResetToken(ctx context.Context, id uint, req dto.UpdatePassResetTokenRequest) error
	UpdateSocialLink(ctx context.Context, linkId uint, req *dto.UpdateSocialLinkRequest) error
	Delete(ctx context.Context, id uint) error
	RemoveSocialLink(ctx context.Context, linkId uint) error
	Unfriend(ctx context.Context, target_id uint) error
	RejectFriendRequest(ctx context.Context, target_id uint) error
	ChangePassword(ctx context.Context, req dto.ChangePasswordRequest) error
	ExecuteReset(ctx context.Context, token string, req dto.ResetPasswordRequest) error
	CleanRefreshToken(ctx context.Context) error
	CleanResetToken(ctx context.Context) error
	CleanNotifications(ctx context.Context) error

	//For Websocket
	FindByIdWithoutCtx(id uint) (*dto.UserResponse, error)
	FindOnlineUsers() ([]uint, error)
}
