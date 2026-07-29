package services

import (
	"chatapp/core"
	"chatapp/hub"
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"os"

	"gorm.io/gorm"
)


type userServices struct {
	hub              *hub.Hub
	UserRepositories core.UserRepositories
	frontendUrl      string
	backendUrl       string
	frontendJoinUrl  string
	roomsPath        string
	usersPath        string
}

func NewUser(repo core.UserRepositories, hub *hub.Hub) core.UserServices {
	return &userServices{
		hub:              hub,
		UserRepositories: repo,
		frontendUrl:      os.Getenv("FRONTEND_URL"),
		backendUrl:       os.Getenv("BACKEND_URL"),
		frontendJoinUrl:  os.Getenv("FRONTEND_JOIN_URL"),
		roomsPath:        os.Getenv("ROOMS_PATH"),
		usersPath:        os.Getenv("USERS_PATH")}
}
func (u *userServices) FindAll(ctx context.Context, filter string) ([]dto.UserResponse, error) {
	users, err := u.UserRepositories.GetAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	currentUserId, _ := ctx.Value("user_id").(uint)

	var response []dto.UserResponse

	for _, user := range users {
		var profilePicture string
		var provider string

		if user.ProfilePicture != nil {
			profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
		}

		if user.Provider != nil {
			provider = *user.Provider
		} else {
			provider = ""
		}

		visible := u.checkPrivacyAccess(user.ID, currentUserId)

		item := dto.UserResponse{
			ID:             user.ID,
			Email:          "", // Email hidden by default
			Provider:       provider,
			ProfilePicture: profilePicture,
			Username:       user.Username,
			Name:           user.Name,
			LastSeenAt:     u.getVisibleLastSeen(&user, currentUserId),
			CreatedAt:      user.CreatedAt,
		}

		if user.ID == currentUserId {
			item.Email = user.Email
		}

		if !visible {
			item.Name = ""
			item.Bio = ""
			item.ProfilePicture = ""
			item.Email = ""
		}

		response = append(response, item)
	}

	return response, nil
}
func (u *userServices) FindByUsername(ctx context.Context, username string) (*dto.UserResponse, error) {
	user, err := u.UserRepositories.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}

	currentUserId, _ := ctx.Value("user_id").(uint)
	visible := u.checkPrivacyAccess(user.ID, currentUserId)

	var profilePicture string
	var provider string

	if user.ProfilePicture != nil {
		profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
	}

	if user.Provider != nil {
		provider = *user.Provider
	} else {
		provider = ""
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          "", // Email hidden by default
		Provider:       provider,
		Username:       user.Username,
		Name:           user.Name,
		LastSeenAt:     u.getVisibleLastSeen(user, currentUserId),
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
	}

	if user.ID == currentUserId {
		response.Email = user.Email
	}

	if !visible {
		response.Name = ""
		response.Bio = ""
		response.ProfilePicture = ""
		response.Email = ""
	} else {
		response.Bio = user.Bio
	}

	return &response, nil
}
func (u *userServices) FindById(ctx context.Context, id uint) (*dto.UserResponse, error) {
	user, err := u.UserRepositories.GetById(ctx, id)
	if err != nil {
		return nil, err
	}

	currentUserId, _ := ctx.Value("user_id").(uint)

	var profilePicture string
	var provider string

	if user.ProfilePicture != nil {
		profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
	}

	if user.Provider != nil {
		provider = *user.Provider
	} else {
		provider = ""
	}

	visible := u.checkPrivacyAccess(user.ID, currentUserId)

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Provider:       provider,
		Username:       user.Username,
		Name:           user.Name,
		LastSeenAt:     u.getVisibleLastSeen(user, currentUserId),
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
	}

	if visible {
		response.Bio = user.Bio
	}

	return &response, nil
}
func (u *userServices) FindByToken(ctx context.Context, token string) (*dto.UserResponse, error) {
	user, err := u.UserRepositories.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	var profilePicture string
	var userProvider string

	if user.ProfilePicture != nil {
		profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
	}

	if user.Provider != nil {
		userProvider = *user.Provider
	} else {
		userProvider = ""
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Provider:       userProvider,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		LastSeenAt:     user.LastSeenAt,
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
	var provider string

	if user.ProfilePicture != nil {
		profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
	}

	if user.Provider != nil {
		provider = *user.Provider
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Provider:       provider,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		LastSeenAt:     user.LastSeenAt,
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
	var userProvider string

	if user.ProfilePicture != nil {
		profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
	}

	if user.Provider != nil {
		userProvider = *user.Provider
	} else {
		userProvider = ""
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Provider:       userProvider,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		LastSeenAt:     user.LastSeenAt,
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
	}

	return &response, nil
}
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
		profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
	}

	response := dto.UserResponse{
		ID:             user.ID,
		ProfilePicture: profilePicture,
		Email:          user.Email,
		Bio:            user.Bio,
		Username:       user.Username,
		Name:           user.Name,
		LastSeenAt:     user.LastSeenAt,
		IsVerified:     user.IsVerified,
		CreatedAt:      user.CreatedAt,
	}

	return &response, nil
}
func (u *userServices) Update(ctx context.Context, req *dto.UpdateUserRequest) (*models.User, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	existUser, err := u.UserRepositories.GetById(ctx, userId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("User id tidak ditemukan: %w", err)
		}
		return nil, err
	}

	if req.ProfilePicture != nil {
		existUser.ProfilePicture = req.ProfilePicture
	}

	if req.Bio != nil {
		existUser.Bio = *req.Bio
	}

	if req.Username != nil {
		existingUser, err := u.UserRepositories.GetByUsername(ctx, *req.Username)
		if err == nil && existingUser != nil && existingUser.ID != userId {
			return nil, fmt.Errorf("username already taken")
		}
		existUser.Username = *req.Username
	}

	if req.Name != nil {
		existUser.Name = *req.Name
	}

	if req.Password != nil {
		existUser.Password = *req.Password
	}

	if err := u.UserRepositories.Update(ctx, existUser.ID, existUser); err != nil {
		return nil, err
	}

	return existUser, nil

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
		ExpiredAt: req.ExpiresAt,
	}

	if err := u.UserRepositories.UpdatePassResetToken(ctx, &updateReq); err != nil {
		return err
	}

	return nil
}
func (u *userServices) FindUnreadNotifCount(ctx context.Context) ([]dto.UnreadNotifResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	unreadRes, err := u.UserRepositories.GetUnreadNotifCount(ctx, userId)
	if err != nil {
		return nil, err
	}

	var response []dto.UnreadNotifResponse

	for _, data := range unreadRes {
		response = append(response, dto.UnreadNotifResponse{
			Count: data.Count,
			Type:  data.Type,
		})
	}

	return response, nil
}
func (u *userServices) UpdateReadNotifications(ctx context.Context) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	if err := u.UserRepositories.UpdateNotifRead(ctx, userId); err != nil {
		return err
	}

	return nil
}
func (u *userServices) CleanRefreshToken(ctx context.Context) error {
	if err := u.UserRepositories.DeleteExpiredRefreshToken(ctx); err != nil {
		return err
	}

	return nil
}
func (u *userServices) CleanResetToken(ctx context.Context) error {
	if err := u.UserRepositories.DeleteExpiredResetToken(ctx); err != nil {
		return err
	}

	return nil
}
func (u *userServices) CleanNotifications(ctx context.Context) error {
	if err := u.UserRepositories.DeleteReadedNotifications(ctx); err != nil {
		return err
	}

	return nil
}
