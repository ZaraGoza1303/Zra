package repositories

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/models"
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type authRepositories struct {
	DB *gorm.DB
}

func NewAuth(db *gorm.DB) core.AuthRepositories {
	return &authRepositories{DB: db}
}

func (r *authRepositories) Register(ctx context.Context, user *models.User) error {
	result := r.DB.WithContext(ctx).Create(user)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

func (r *authRepositories) Login(ctx context.Context, email, password string) (*models.User, error) {
	var existsUser models.User
	result := r.DB.WithContext(ctx).Where("email = ?", email).First(&existsUser)
	if result.Error != nil {
		return nil, result.Error
	}

	return &existsUser, nil
}

func (r *authRepositories) SelectRefreshToken(ctx context.Context, token string, refreshUUID string) (bool, error) {
	var userToken models.UserToken
	err := r.DB.WithContext(ctx).
		Where("refresh_token = ? AND expires_at > ?", token, time.Now()).
		First(&userToken).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *authRepositories) InsertRefreshToken(ctx context.Context, req dto.InsertRefreshRequest) error {
	newToken := models.UserToken{
		UserID:       req.UserID,
		RefreshToken: req.RefreshToken,
		ExpiresAt:    time.Now().Add(req.RefreshDuration),
		CreatedAt:    time.Now(),
	}

	upsertConflict := clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"refresh_token", "expires_at", "created_at"}),
	}

	return r.DB.WithContext(ctx).Clauses(upsertConflict).Create(&newToken).Error
}

func (r *authRepositories) UpdateRefreshToken(ctx context.Context, req dto.UpdateRefreshRequest) error {
	result := r.DB.WithContext(ctx).Model(&models.UserToken{}).
		Where("refresh_token = ?", req.OldRefreshToken).
		Updates(models.UserToken{
			RefreshToken: req.NewRefreshToken,
			ExpiresAt:    time.Now().Add(req.RefreshDuration),
		})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

func (r *authRepositories) DeleteRefreshToken(ctx context.Context, userID uint, token, accessUUID, refreshUUID string) error {
	err := r.DB.WithContext(ctx).
		Where("user_id = ? AND refresh_token = ?", userID, token).
		Delete(&models.UserToken{}).Error

	return err
}
