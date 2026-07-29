package services

import (
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func (u *userServices) ChangePassword(ctx context.Context, req dto.ChangePasswordRequest) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	user, err := u.UserRepositories.GetById(ctx, userId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("User id tidak ditemukan: %w", err)
		}
		return err
	}

	if req.NewPassword != req.ConfirmPassword {
		return helper.ErrPasswordNotMatch
	}

	if err := helper.CompareHashedPassword(user.Password, req.OldPassword); err != nil {
		return helper.ErrOldPassNotMatch
	}

	newPasswordHash, err := helper.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	newPassword := models.User{
		Password: newPasswordHash,
	}

	if err := u.UserRepositories.Update(ctx, userId, &newPassword); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Password user tidak berhasil diubah: %w", err)
		}
		return err
	}

	return nil
}
func (u *userServices) ExecuteReset(ctx context.Context, token string, req dto.ResetPasswordRequest) error {
	result, err := u.UserRepositories.GetByPassResetToken(ctx, token)
	if err != nil {
		return helper.ErrTokenExpired
	}

	if result.ExpiredAt.Before(time.Now()) {
		return helper.ErrTokenExpired
	}

	if req.NewPassword == "" || req.ConfirmPassword == "" {
		return helper.ErrCantEmpty
	}

	if req.NewPassword != req.ConfirmPassword {
		return helper.ErrPasswordNotMatch
	}

	hashPassword, err := helper.HashPassword(req.ConfirmPassword)
	if err != nil {
		return err
	}

	updateUser := models.User{
		Password: hashPassword,
	}

	if err := u.UserRepositories.Update(ctx, result.UserID, &updateUser); err != nil {
		return err
	}

	if err := u.UserRepositories.DeleteResetToken(ctx, token); err != nil {
		return err
	}

	return nil
}
