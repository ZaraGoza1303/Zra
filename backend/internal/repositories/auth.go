package repositories

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type authRepositories struct {
	DB    *gorm.DB
	Redis redis.Client
}

func NewAuth(db *gorm.DB, redis redis.Client) core.AuthRepositories {
	return &authRepositories{DB: db, Redis: redis}
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
	loginAttemptKey := "login_attempt:" + strings.ToLower(email)
	attempt, _ := r.Redis.Get(ctx, loginAttemptKey).Int()
	if attempt >= 10 {
		return nil, errors.New("Too many attempts, wait 10 minute to try again")
	}

	var existsUser models.User
	result := r.DB.WithContext(ctx).Where("email = ?", email).First(&existsUser)
	if result.Error != nil || helper.CompareHashedPassword(existsUser.Password, password) != nil {
		r.Redis.Incr(ctx, loginAttemptKey)
		r.Redis.Expire(ctx, loginAttemptKey, 10*time.Minute)
		return nil, errors.New("Email atau password salah")
	}

	r.Redis.Del(ctx, loginAttemptKey)

	return &existsUser, nil
}

func (r *authRepositories) SelectRefreshToken(ctx context.Context, token string, refreshUUID string) (bool, error) {
	key := "refresh:" + refreshUUID
	val, err := r.Redis.Get(ctx, key).Result()
	if err == nil && val != "" {
		return true, nil
	}

	if err != nil && err != redis.Nil {
		log.Printf("Redis error: %v", err)
	}

	var userToken models.UserToken
	err = r.DB.WithContext(ctx).Where("refresh_token = ? AND expires_at > ?", token, time.Now()).First(&userToken).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil // Token salah atau sudah expired
		}
		return false, err
	}

	return true, nil
}

func (r *authRepositories) InsertRefreshToken(ctx context.Context, req dto.InsertRefreshRequest) error {
	userKey := "user:auth:" + strconv.Itoa(int(req.UserID))
	accessKey := "access:" + req.AccessUUID
	refreshKey := "refresh:" + req.RefreshUUID

	pipe := r.Redis.Pipeline()
	pipe.Set(ctx, accessKey, req.UserID, req.AccessDuration)
	pipe.Set(ctx, refreshKey, req.UserID, req.RefreshDuration)
	pipe.SAdd(ctx, userKey, accessKey)
	pipe.SAdd(ctx, userKey, refreshKey)
	pipe.Expire(ctx, userKey, req.RefreshDuration)

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("redis pipeline failed: %w", err)
	}

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
	result := r.DB.WithContext(ctx).Model(&models.UserToken{}).Where("refresh_token = ?", req.OldRefreshToken).
		Updates(models.UserToken{RefreshToken: req.NewRefreshToken, ExpiresAt: time.Now().Add(req.RefreshDuration)})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	userKey := "user:auth:" + strconv.Itoa(int(req.UserID))
	newAccessKey := "access:" + req.NewAccessUUID
	newRefreshKey := "refresh:" + req.NewRefreshUUID
	oldAccessKey := "access:" + req.OldAccessUUID
	oldRefreshKey := "refresh:" + req.OldRefreshUUID

	uuids, _ := r.Redis.SMembers(ctx, userKey).Result()
	pipe := r.Redis.Pipeline()

	for _, fullKey := range uuids {
		ex, _ := r.Redis.Exists(ctx, fullKey).Result()
		if ex == 0 {
			pipe.SRem(ctx, userKey, fullKey)
		}
	}

	pipe.Del(ctx, oldAccessKey, oldRefreshKey)
	pipe.SRem(ctx, userKey, oldAccessKey, oldRefreshKey)

	pipe.Set(ctx, newAccessKey, req.UserID, req.AccessDuration)
	pipe.Set(ctx, newRefreshKey, req.UserID, req.RefreshDuration)
	pipe.SAdd(ctx, userKey, newAccessKey, newRefreshKey)
	pipe.Expire(ctx, userKey, req.RefreshDuration)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("redis pipeline failed: %w", err)
	}

	return nil
}

func (r *authRepositories) DeleteRefreshToken(ctx context.Context, userID uint, token, accessUUID, refreshUUID string) error {
	userKey := "user:auth:" + strconv.Itoa(int(userID))
	accessKey := "access:" + accessUUID
	refreshKey := "refresh:" + refreshUUID

	pipe := r.Redis.Pipeline()
	pipe.Del(ctx, accessKey, refreshKey)
	pipe.SRem(ctx, userKey, accessKey, refreshKey)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("Redis pipeline failed: %v", err)
	}

	err = r.DB.WithContext(ctx).Where("user_id = ? AND refresh_token = ?", userID, token).Delete(&models.UserToken{}).Error
	if err != nil {
		return err
	}

	return err
}
