package repositories

import (
	"chatapp/core"
	"chatapp/internal/models"
	"context"
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
		query = query.Where("name LIKE ?", filter+"%")
	}

	result := query.Find(&users)
	if result.Error != nil {
		return nil, result.Error
	}

	return users, nil
}

func (u *userRepositories) GetByEmailAndProvider(ctx context.Context, email, provider string) (*models.User, error) {
	var user models.User

	result := u.DB.WithContext(ctx).Where("email = ? AND provider = ?", email, provider).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}

	return &user, nil
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

func (u *userRepositories) Delete(ctx context.Context, id uint) error {
	err := u.DB.WithContext(ctx).Where("id = ?", id).Delete(&models.User{})
	if err.Error != nil {
		return err.Error
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
