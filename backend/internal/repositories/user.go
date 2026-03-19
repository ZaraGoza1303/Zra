package repositories

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type userRepositories struct {
	DB *gorm.DB
}


func NewUser(db *gorm.DB) core.UserRepositories {
	return &userRepositories{DB: db}
}

func (u *userRepositories) GetAll(ctx context.Context, filter string) ([]models.User, error) {
	var users []models.User

	query := u.DB.WithContext(ctx).Model(&models.User{})

	if filter != "" {
		query = query.Where("username LIKE ?", filter+"%")
	}

	result := query.Find(&users)
	if result.Error != nil {
		return nil, result.Error
	}

	return users, nil
}

// GetByUsername implements [core.UserRepositories].
func (u *userRepositories) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User

	result := u.DB.WithContext(ctx).Where("username = ?", username).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}

	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &user, nil
}

func (u *userRepositories) GetByEmailAndProvider(ctx context.Context, email, provider string) (*models.User, error) {
	var user models.User

	result := u.DB.WithContext(ctx).Where("email = ? AND provider = ?", email, provider).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}

	return &user, nil
}

// GetListFriend implements [core.UserRepositories].
func (u *userRepositories) GetListFriend(ctx context.Context, filter string, user_id uint) ([]models.User, error) {
	var friendLists []models.User

	query := u.DB.WithContext(ctx).Model(&models.User{}).
		Joins("JOIN friends ON (friends.user_id = users.id OR friends.friend_id = users.id)").
		Where("(friends.user_id = ? OR friends.friend_id = ?)", user_id, user_id).
		Where("friends.status = ?", "accepted").
		Where("users.id != ?", user_id)

	if filter != "" {
		query = query.Where("users.username LIKE ?", filter+"%")
	}

	if err := query.Find(&friendLists).Error; err != nil {
		return nil, err
	}

	return friendLists, nil
}

// GetListFriendRequest implements [core.UserRepositories].
func (u *userRepositories) GetListFriendRequest(ctx context.Context, filter string, user_id uint) ([]models.User, error) {
	var friendRequests []models.User

	query := u.DB.WithContext(ctx).Model(&models.User{}).
		Joins("JOIN friends ON friends.user_id = users.id").
		Where("friends.friend_id = ?", user_id).
		Where("friends.status = ?", "pending")

	if filter != "" {
		query = query.Where("users.username LIKE ?", filter+"%")
	}

	if err := query.Find(&friendRequests).Error; err != nil {
		return nil, err
	}

	return friendRequests, nil
}

// GetFriendship implements [core.UserRepositories].
func (u *userRepositories) GetFriendship(ctx context.Context, user_id uint, target_id uint) (bool, error) {
	var alreadyFriend int64

	result := u.DB.WithContext(ctx).
		Model(&models.Friend{}).
		Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)", user_id, target_id, target_id, user_id).
		Count(&alreadyFriend)

	if result.Error != nil {
		return false, result.Error
	}

	return alreadyFriend > 0, nil
}

// GetUnreadNotifCount implements [core.UserRepositories].
func (u *userRepositories) GetUnreadNotifCount(ctx context.Context, user_id uint) ([]dto.UnreadNotifResponse, error) {
	var unread []dto.UnreadNotifResponse

	result := u.DB.WithContext(ctx).
		Model(&models.Notification{}).
		Select("type, COUNT(*) as count").
		Where("user_id = ? AND is_read = ?", user_id, false).
		Group("type").
		Scan(&unread)

	if result.Error != nil {
		return nil, result.Error
	}

	return unread, nil
}

func (u *userRepositories) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	result := u.DB.WithContext(ctx).Where("email = ?", email).First(&user)

	if result.Error != nil {
		return nil, result.Error
	}

	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &user, nil
}

func (u *userRepositories) GetById(ctx context.Context, id uint) (*models.User, error) {
	var user models.User

	err := u.DB.WithContext(ctx).Where("id = ?", id).First(&user)
	if err.Error != nil {
		return nil, err.Error
	}

	if err.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &user, nil
}

func (u *userRepositories) GetByToken(ctx context.Context, token string) (*models.User, error) {
	var user models.User

	result := u.DB.WithContext(ctx).Where("verify_token = ?", token).First(&user)

	if result.Error != nil {
		return nil, result.Error
	}

	return &user, nil
}

func (u *userRepositories) GetByPassResetToken(ctx context.Context, token string) (*models.PasswordReset, error) {
	var passwordReset models.PasswordReset

	err := u.DB.WithContext(ctx).
		Preload("User").
		Where("token = ? AND expires_at > ?", token, time.Now()).
		First(&passwordReset).Error

	if err != nil {
		return nil, err
	}

	return &passwordReset, nil
}

// InsertFriendRequest implements [core.UserRepositories].
func (u *userRepositories) InsertFriendRequest(ctx context.Context, req *models.Friend) error {
	result := u.DB.WithContext(ctx).Create(req)
	if result.Error != nil {
		return result.Error
	}

	return nil
}

// InsertNotification implements [core.UserRepositories].
func (u *userRepositories) InsertNotification(ctx context.Context, req *models.Notification) error {
	result := u.DB.WithContext(ctx).Create(req)
	if result.Error != nil {
		return result.Error
	}

	return nil
}

// UpdateFriendRequest implements [core.UserRepositories].
func (u *userRepositories) UpdateFriendRequest(ctx context.Context, req *models.Friend) error {
	result := u.DB.WithContext(ctx).
		Model(req).
		Select("Status", "UpdatedAt").
		Updates(req)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("friend request not found or already accepted")
	}
	return nil
}

func (u *userRepositories) Update(ctx context.Context, id uint, req *models.User) error {
	result := u.DB.WithContext(ctx).Clauses(clause.Returning{}).Where("id = ?", id).Updates(req)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

func (u *userRepositories) UpdatePassResetToken(ctx context.Context, req *models.PasswordReset) error {
	err := u.DB.WithContext(ctx).Create(req).Error
	if err != nil {
		return err
	}

	return err
}

// UpdateNotifRead implements [core.UserRepositories].
func (u *userRepositories) UpdateNotifRead(ctx context.Context, user_id uint) error {
	result := u.DB.WithContext(ctx).
		Model(&models.Notification{}).
		Where("user_id = ?", user_id).
		Update("is_read", true)

	if result.Error != nil {
		return result.Error
	}

	return nil
}

func (u *userRepositories) Delete(ctx context.Context, id uint) error {
	err := u.DB.WithContext(ctx).Where("id = ?", id).Delete(&models.User{})
	if err.Error != nil {
		return err.Error
	}

	return nil
}

// DeleteFriendship implements [core.UserRepositories].
func (u *userRepositories) DeleteFriendship(ctx context.Context, user_id uint, target_id uint) error {
	result := u.DB.WithContext(ctx).
		Where("(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)", user_id, target_id, target_id, user_id).
		Delete(&models.Friend{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("Failed to unfriend")
	}

	return nil
}

// DeleteFriendRequest implements [core.UserRepositories].
func (u *userRepositories) DeleteFriendRequest(ctx context.Context, user_id uint, target_id uint) error {
	result := u.DB.WithContext(ctx).
		Where("user_id = ? AND friend_id = ? AND status = ?", user_id, target_id, "pending").
		Delete(&models.Friend{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("friend request not foundz")
	}

	return nil
}

func (u *userRepositories) DeleteResetToken(ctx context.Context, token string) error {
	err := u.DB.WithContext(ctx).Where("token = ?", token).Delete(&models.PasswordReset{}).Error

	if err != nil {
		return err
	}

	return err
}

// DeleteRefreshToken implements [core.UserRepositories].
func (u *userRepositories) DeleteExpiredRefreshToken(ctx context.Context) error {
	result := u.DB.WithContext(ctx).Where("expired_at < NOW()").Delete(&models.UserToken{})
	if result.Error != nil {
		return result.Error
	}

	return nil
}


// DeleteExpiredResetToken implements [core.UserRepositories].
func (u *userRepositories) DeleteExpiredResetToken(ctx context.Context) error {
	result := u.DB.WithContext(ctx).Where("expired_at < NOW()").Delete(&models.PasswordReset{})
	if result.Error != nil {
		return result.Error
	}

	return nil
}

// DeleteReadedNotifications implements [core.UserRepositories].
func (u *userRepositories) DeleteReadedNotifications(ctx context.Context) error {
	result := u.DB.WithContext(ctx).Where("is_read = true").Delete(&models.Notification{})
	if result.Error != nil {
		return result.Error
	}

	return nil
}

func (u *userRepositories) VerifyEmail(ctx context.Context, id uint, req *models.User) error {
	result := u.DB.WithContext(ctx).Where("id = ?", id).Save(req)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}
