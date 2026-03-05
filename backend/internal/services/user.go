package services

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"gorm.io/gorm"
)

type userServices struct {
	UserRepositories core.UserRepositories
	frontendUrl      string
	backendUrl       string
	frontendJoinUrl  string
	roomsPath        string
	usersPath        string
}

func NewUser(repo core.UserRepositories) core.UserServices {
	return &userServices{UserRepositories: repo,
		frontendUrl:     os.Getenv("FRONTEND_URL"),
		backendUrl:      os.Getenv("BACKEND_URL"),
		frontendJoinUrl: os.Getenv("FRONTEND_JOIN_URL"),
		roomsPath:       os.Getenv("ROOMS_PATH"),
		usersPath:       os.Getenv("USERS_PATH")}
}

func (u *userServices) FindAll(ctx context.Context, filter string) ([]dto.UserResponse, error) {
	users, err := u.UserRepositories.GetAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	var response []dto.UserResponse

	for _, user := range users {
		var profilePicture string
		if user.ProfilePicture != nil {
			profilePicture = fmt.Sprintf("%s%s%s", u.backendUrl, u.usersPath, *user.ProfilePicture)
		} else {
			profilePicture = ""
		}

		item := dto.UserResponse{
			ID:             user.ID,
			Email:          user.Email,
			ProfilePicture: profilePicture,
			Username:       user.Username,
			Name:           user.Name,
			CreatedAt:      user.CreatedAt,
		}

		response = append(response, item)
	}

	return response, nil
}

// FindByUsername implements [core.UserServices].
func (u *userServices) FindByUsername(ctx context.Context, username string) (*dto.UserResponse, error) {
	user, err := u.UserRepositories.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}

	var profilePicture string
	if user.ProfilePicture != nil {
		profilePicture = fmt.Sprintf("%s%s%s", u.backendUrl, u.usersPath, *user.ProfilePicture)
	} else {
		profilePicture = ""
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
	}

	return &response, nil
}

func (u *userServices) FindById(ctx context.Context, id uint) (*dto.UserResponse, error) {
	user, err := u.UserRepositories.GetById(ctx, id)
	if err != nil {
		return nil, err
	}

	var profilePicture string
	if user.ProfilePicture != nil {
		profilePicture = fmt.Sprintf("%s%s%s", u.backendUrl, u.usersPath, *user.ProfilePicture)
	} else {
		profilePicture = ""
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
	}

	return &response, nil
}

// FindListFriend implements [core.UserServices].
func (u *userServices) FindListFriend(ctx context.Context, filter string) ([]dto.UserResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	users, err := u.UserRepositories.GetListFriend(ctx, filter, userId)
	if err != nil {
		return nil, err
	}

	var response []dto.UserResponse

	for _, user := range users {
		var profilePicture string
		if user.Receiver.ProfilePicture != nil {
			profilePicture = fmt.Sprintf("%s%s%s", u.backendUrl, u.usersPath, *user.Receiver.ProfilePicture)
		} else {
			profilePicture = ""
		}

		item := dto.UserResponse{
			ID:             user.Receiver.ID,
			Email:          user.Receiver.Email,
			ProfilePicture: profilePicture,
			Username:       user.Receiver.Username,
			Name:           user.Receiver.Name,
			CreatedAt:      user.CreatedAt,
		}

		response = append(response, item)
	}

	return response, nil
}

// FIndListFriendRequest implements [core.UserServices].
func (u *userServices) FindListFriendRequest(ctx context.Context, filter string) ([]dto.UserResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	users, err := u.UserRepositories.GetListFriendRequest(ctx, filter, userId)
	if err != nil {
		return nil, err
	}

	var response []dto.UserResponse

	for _, user := range users {
		var profilePicture string
		if user.Sender.ProfilePicture != nil {
			profilePicture = fmt.Sprintf("%s%s%s", u.backendUrl, u.usersPath, *user.Sender.ProfilePicture)
		} else {
			profilePicture = ""
		}

		item := dto.UserResponse{
			ID:             user.Sender.ID,
			Email:          user.Sender.Email,
			ProfilePicture: profilePicture,
			Username:       user.Sender.Username,
			Name:           user.Sender.Name,
			CreatedAt:      user.CreatedAt,
		}

		response = append(response, item)
	}

	return response, nil
}

func (u *userServices) FindByToken(ctx context.Context, token string) (*dto.UserResponse, error) {
	user, err := u.UserRepositories.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	var profilePicture string
	if user.ProfilePicture != nil {
		profilePicture = fmt.Sprintf("%s%s%s", u.backendUrl, u.usersPath, *user.ProfilePicture)
	} else {
		profilePicture = ""
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
	}

	return &response, nil
}

func (u *userServices) FindByEmail(ctx context.Context, email string) (*dto.UserResponse, error) {
	user, err := u.UserRepositories.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("User tidak ditemukan: %w", err)
		}
		return nil, err
	}

	var profilePicture string
	if user.ProfilePicture != nil {
		profilePicture = fmt.Sprintf("%s%s%s", u.backendUrl, u.usersPath, *user.ProfilePicture)
	} else {
		profilePicture = ""
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
		UpdatedAt:      user.UpdatedAt,
	}

	return &response, nil

}

func (u *userServices) FindByEmailAndProvider(ctx context.Context, email, provider string) (*dto.UserResponse, error) {
	user, err := u.UserRepositories.GetByEmailAndProvider(ctx, email, provider)
	if err != nil {
		return nil, err
	}

	var profilePicture string
	if user.ProfilePicture != nil {
		profilePicture = fmt.Sprintf("%s%s%s", u.backendUrl, u.usersPath, *user.ProfilePicture)
	} else {
		profilePicture = ""
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
	}

	return &response, nil
}

// MakeFriendRequest implements [core.UserServices].
func (u *userServices) MakeFriendRequest(ctx context.Context, target_id uint) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	if userId == target_id {
		return fmt.Errorf("kamu tidak bisa menambahkan diri sendiri")
	}

	_, err := u.UserRepositories.GetById(ctx, target_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Target id not found %w", err)
		}
		return err
	}

	alreadyFriend, err := u.UserRepositories.GetFriendship(ctx, userId, target_id)
	if err != nil {
		return err
	}

	if alreadyFriend {
		return errors.New("friend request already exists or you are already friends")
	}

	newFriend := models.Friend{
		UserID:    userId,
		FriendID:  target_id,
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	if err := u.UserRepositories.InsertFriendRequest(ctx, &newFriend); err != nil {
		return err
	}

	return nil
}

// UpdateFriendRequest implements [core.UserServices].
func (u *userServices) UpdateFriendRequest(ctx context.Context, target_id uint) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	_, err := u.UserRepositories.GetById(ctx, target_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Target id not found %w", err)
		}
		return err
	}

	friendReq := models.Friend{
		UserID:    target_id,
		FriendID:  userId,
		Status:    "accepted",
		UpdatedAt: time.Now(),
	}

	if err := u.UserRepositories.UpdateFriendRequest(ctx, &friendReq); err != nil {
		return err
	}

	return nil
}

func (u *userServices) Update(ctx context.Context, userId uint, req *dto.UpdateUserRequest) (*models.User, error) {
	existUser, err := u.UserRepositories.GetById(ctx, userId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("User id tidak ditemukan: %w", err)
		}
		return nil, err
	}

	if existUser.ID != req.ID {
		return nil, helper.ErrNotAllowed
	}

	if req.ProfilePicture != nil {
		existUser.ProfilePicture = req.ProfilePicture
	}

	if req.Bio != nil {
		existUser.Bio = *req.Bio
	}

	if req.Name != nil {
		existUser.Name = *req.Name
	}

	if req.Password != nil {
		existUser.Password = *req.Password
	}

	if err := u.UserRepositories.Update(ctx, req.ID, existUser); err != nil {
		return nil, err
	}

	return existUser, nil

}

func (u *userServices) UpdatePassResetToken(ctx context.Context, id uint, req dto.UpdatePassResetTokenRequest) error {
	_, err := u.UserRepositories.GetById(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	updateReq := models.PasswordReset{
		UserID:    req.UserID,
		Token:     req.Token,
		ExpiresAt: req.ExpiresAt,
	}

	if err := u.UserRepositories.UpdatePassResetToken(ctx, &updateReq); err != nil {
		return err
	}

	return nil

}

func (u *userServices) Delete(ctx context.Context, id uint) error {
	user, err := u.UserRepositories.GetById(ctx, id)
	if err != nil || user.ID == 0 {
		return errors.New("Invalid ID")
	}

	err = u.UserRepositories.Delete(ctx, id)
	if err != nil {
		return err
	}

	return nil
}

// RejectFriendRequest implements [core.UserServices].
func (u *userServices) RejectFriendRequest(ctx context.Context, target_id uint) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	_, err := u.UserRepositories.GetById(ctx, target_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Target id not found : %w", err)
		}
		return err
	}

	if err := u.UserRepositories.DeleteFriendRequest(ctx, target_id, userId); err != nil {
		return err
	}

	return nil
}

func (u *userServices) ChangePassword(ctx context.Context, id uint, req dto.ChangePasswordRequest) error {
	user, err := u.UserRepositories.GetById(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("User id tidak ditemukan: %w", err)
		}
		return err
	}

	if user.ID != req.UserId {
		return helper.ErrNotAllowed
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

	if err := u.UserRepositories.Update(ctx, req.UserId, &newPassword); err != nil {
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

	if result.ExpiresAt.Before(time.Now()) {
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

// Unfriend implements [core.UserServices].
func (u *userServices) Unfriend(ctx context.Context, target_id uint) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	if userId == target_id {
		return errors.New("You can't unfriend yourself")
	}

	_, err := u.UserRepositories.GetById(ctx, target_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("Target id not found : %w", err)
		}
		return err
	}

	alreadyFriend, err := u.UserRepositories.GetFriendship(ctx, userId, target_id)
	if err != nil {
		return err
	}

	if !alreadyFriend {
		return errors.New("Not in Friendship!")
	}

	if err := u.UserRepositories.DeleteFriendship(ctx, target_id, userId); err != nil {
		return err
	}

	return nil
}

// FindByIdWithoutCtx implements [core.UserServices].
func (u *userServices) FindByIdWithoutCtx(id uint) (*dto.UserResponse, error) {
	user, err := u.UserRepositories.GetById(context.Background(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("User id: %d not found", id)
		}
		return nil, err
	}

	var profilePicture string
	if user.ProfilePicture != nil {
		profilePicture = fmt.Sprintf("%s%s%s", u.backendUrl, u.usersPath, *user.ProfilePicture)
	} else {
		profilePicture = ""
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
	}

	return &response, nil
}
