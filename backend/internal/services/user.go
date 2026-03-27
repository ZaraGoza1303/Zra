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
	hub              *dto.Hub
	UserRepositories core.UserRepositories
	frontendUrl      string
	backendUrl       string
	frontendJoinUrl  string
	roomsPath        string
	usersPath        string
}

func NewUser(repo core.UserRepositories, hub *dto.Hub) core.UserServices {
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
			Email:          user.Email,
			Provider:       provider,
			ProfilePicture: profilePicture,
			Username:       user.Username,
			Name:           user.Name,
			LastSeenAt:     u.getVisibleLastSeen(&user, currentUserId),
			CreatedAt:      user.CreatedAt,
		}

		if !visible {
			item.Name = ""
			item.Bio = ""
			item.ProfilePicture = ""
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
		var provider string

		if user.ProfilePicture != nil {
			profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
		}

		if user.Provider != nil {
			provider = *user.Provider
		} else {
			provider = ""
		}

		item := dto.UserResponse{
			ID:             user.ID,
			Email:          user.Email,
			Provider:       provider,
			ProfilePicture: profilePicture,
			Username:       user.Username,
			Name:           user.Name,
			Bio:            user.Bio,
			LastSeenAt:     user.LastSeenAt,
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
		var provider string

		if user.ProfilePicture != nil {
			profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
		}

		if user.Provider != nil {
			provider = *user.Provider
		} else {
			provider = ""
		}

		item := dto.UserResponse{
			ID:             user.ID,
			Email:          user.Email,
			Provider:       provider,
			ProfilePicture: profilePicture,
			Username:       user.Username,
			Name:           user.Name,
			LastSeenAt:     user.LastSeenAt,
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

// FindUnreadNotifications implements [core.UserServices].
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

// FindSocialLinks implements [core.UserServices].
func (u *userServices) FindSocialLinks(ctx context.Context) ([]dto.SocialLinkResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	links, err := u.UserRepositories.GetLinks(ctx, userId)
	if err != nil {
		return nil, err
	}

	var response []dto.SocialLinkResponse
	for _, link := range links {
		var linkType string
		if link.Type != nil {
			linkType = string(*link.Type)
		}

		response = append(response, dto.SocialLinkResponse{
			ID:   link.ID,
			Type: linkType,
			Url:  link.Url,
		})
	}

	return response, nil
}

// FindSocialLinksById implements [core.UserServices].
func (u *userServices) FindSocialLinksById(ctx context.Context, userId uint) ([]dto.SocialLinkResponse, error) {
	links, err := u.UserRepositories.GetLinks(ctx, userId)
	if err != nil {
		return nil, err
	}

	var response []dto.SocialLinkResponse
	for _, link := range links {
		var linkType string
		if link.Type != nil {
			linkType = string(*link.Type)
		}

		response = append(response, dto.SocialLinkResponse{
			ID:   link.ID,
			Type: linkType,
			Url:  link.Url,
		})
	}

	return response, nil
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
		return errors.New("friend request already sent or you are already friends")
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

	var username string
	if user, ok := u.hub.GetClientById(userId); ok {
		username = user.Username
	} else {
		dbUser, err := u.UserRepositories.GetById(ctx, userId)
		if err != nil {
			return err
		}

		username = dbUser.Username
	}

	content := fmt.Sprintf("%s send you a friend request", username)

	newNotif := models.Notification{
		UserID:  target_id,
		Type:    "friend-request",
		Content: content,
	}

	if err := u.UserRepositories.InsertNotification(ctx, &newNotif); err != nil {
		return err
	}

	requestMsg := dto.Message{
		ID:        dto.GenerateId(),
		UserID:    userId,
		ToID:      target_id,
		Username:  username,
		Content:   content,
		Type:      "friend-request",
		TimeStamp: time.Now(),
	}

	u.hub.Signal <- requestMsg

	return nil
}

// CreateSocialLinks implements [core.UserServices].
func (u *userServices) CreateSocialLinks(ctx context.Context, req *dto.CreateSocialLinksRequest) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	social, err := u.UserRepositories.GetSocialLinkByUserId(ctx, userId)
	if err != nil {
		return err
	}

	if social == nil {
		socialRequest := models.SocialLink{
			UserID: userId,
		}
		if err := u.UserRepositories.InsertSocialLink(ctx, &socialRequest); err != nil {
			return err
		}
	}

	var links []models.Link
	for _, link := range req.Link {
		platform := models.Platform(link.Type)
		links = append(links, models.Link{
			SocialLinkID: social.ID,
			Type:         &platform,
			Url:          link.Url,
		})
	}

	if err := u.UserRepositories.InsertLink(ctx, links); err != nil {
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

	var username string
	if user, ok := u.hub.GetClientById(userId); ok {
		username = user.Username
	} else {
		dbUser, err := u.UserRepositories.GetById(ctx, userId)
		if err != nil {
			return err
		}

		username = dbUser.Username
	}

	content := fmt.Sprintf("%s accepted your friend request", username)

	newNotif := models.Notification{
		UserID:  target_id,
		Type:    "friend-accepted",
		Content: content,
	}

	if err := u.UserRepositories.InsertNotification(ctx, &newNotif); err != nil {
		return err
	}

	accMsg := dto.Message{
		ID:        dto.GenerateId(),
		UserID:    userId,
		ToID:      target_id,
		Username:  username,
		Content:   content,
		Type:      "friend-accepted",
		TimeStamp: time.Now(),
	}

	u.hub.Signal <- accMsg

	return nil
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

// UpdateSocialLinks implements [core.UserServices].
func (u *userServices) UpdateSocialLink(ctx context.Context, linkId uint, req *dto.UpdateSocialLinkRequest) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	owned, err := u.UserRepositories.IsLinkOwnedByUser(ctx, userId, linkId)
	if err != nil {
		return err
	}

	if !owned {
		return helper.ErrNotAllowed
	}

	platform := models.Platform(req.Type)
	links := models.Link{
		Type: &platform,
		Url:  req.Url,
	}

	if err := u.UserRepositories.UpdateSocialLink(ctx, linkId, &links); err != nil {
		return err
	}

	return nil
}

// UpdateReadNotifications implements [core.UserServices].
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

// RemoveSocialLink implements [core.UserServices].
func (u *userServices) RemoveSocialLink(ctx context.Context, linkId uint) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	owned, err := u.UserRepositories.IsLinkOwnedByUser(ctx, userId, linkId)
	if err != nil {
		return err
	}

	if !owned {
		return helper.ErrNotAllowed
	}

	if err := u.UserRepositories.DeleteSocialLink(ctx, linkId); err != nil {
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

	var username string
	if user, ok := u.hub.GetClientById(userId); ok {
		username = user.Username
	} else {
		dbUser, err := u.UserRepositories.GetById(ctx, userId)
		if err != nil {
			return err
		}

		username = dbUser.Username
	}

	content := fmt.Sprintf("%s rejected your friend request", username)

	newNotif := models.Notification{
		UserID:  target_id,
		Type:    "friend-rejected",
		Content: content,
	}

	if err := u.UserRepositories.InsertNotification(ctx, &newNotif); err != nil {
		return err
	}

	rejectMsg := dto.Message{
		ID:        dto.GenerateId(),
		UserID:    userId,
		ToID:      target_id,
		Username:  username,
		Content:   content,
		Type:      "friend-rejected",
		TimeStamp: time.Now(),
	}

	u.hub.Signal <- rejectMsg

	return nil
}

// CancelFriendRequest implements [core.UserServices].
func (u *userServices) CancelFriendRequest(ctx context.Context, target_id uint) error {
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

	if err := u.UserRepositories.DeleteFriendRequest(ctx, userId, target_id); err != nil {
		return err
	}

	return nil
}

// GetFriendshipStatus implements [core.UserServices].
func (u *userServices) GetFriendshipStatus(ctx context.Context, target_id uint) (*dto.FriendshipStatusResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	_, err := u.UserRepositories.GetById(ctx, target_id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("Target id not found : %w", err)
		}
		return nil, err
	}

	status, err := u.UserRepositories.GetFriendshipDetailStatus(ctx, userId, target_id)
	if err != nil {
		return nil, err
	}

	response := dto.FriendshipStatusResponse{
		Status: status,
	}

	return &response, nil
}

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

// CheckAndDeleteRefreshToken implements [core.UserServices].
func (u *userServices) CleanRefreshToken(ctx context.Context) error {
	if err := u.UserRepositories.DeleteExpiredRefreshToken(ctx); err != nil {
		return err
	}

	return nil
}

// CleanResetToken implements [core.UserServices].
func (u *userServices) CleanResetToken(ctx context.Context) error {
	if err := u.UserRepositories.DeleteExpiredResetToken(ctx); err != nil {
		return err
	}

	return nil
}

// CleanNotifications implements [core.UserServices].
func (u *userServices) CleanNotifications(ctx context.Context) error {
	if err := u.UserRepositories.DeleteReadedNotifications(ctx); err != nil {
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

	fmt.Printf("DEBUG: userId: %v, targetId: %v, ok: %v\n", userId, target_id, ok)

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

	if err := u.UserRepositories.DeleteFriendship(ctx, userId, target_id); err != nil {
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

// FindOnlineUsers implements [core.UserServices].
func (u *userServices) FindOnlineUsers() ([]uint, error) {
	users, err := u.hub.OnlineMembers()
	if err != nil {
		return nil, err
	}

	return users, nil
}

func (u *userServices) GetSettingsByUserId(userId uint) (*dto.UserSettingsResponse, error) {
	settings, err := u.UserRepositories.GetSettings(context.Background(), userId)
	if err != nil {
		return nil, err
	}

	if settings == nil {
		return &dto.UserSettingsResponse{
			ProfileVisibility: "public",
			LastSeen:          "everyone",
			ReadReceipts:      true,
			MessageNotif:      true,
			GroupNotif:        true,
			Sound:             true,
			Preview:           true,
		}, nil
	}

	return &dto.UserSettingsResponse{
		ProfileVisibility: settings.ProfileVisibility,
		LastSeen:          settings.LastSeen,
		ReadReceipts:      settings.ReadReceipts,
		MessageNotif:      settings.MessageNotif,
		GroupNotif:        settings.GroupNotif,
		Sound:             settings.Sound,
		Preview:           settings.Preview,
	}, nil
}

func (u *userServices) UpdateLastSeen(userId uint) error {
	now := time.Now()
	update := models.User{
		LastSeenAt: &now,
	}
	return u.UserRepositories.Update(context.Background(), userId, &update)
}

func (u *userServices) checkPrivacyAccess(targetUserId, currentUserId uint) bool {
	if currentUserId == 0 {
		return false
	}
	if targetUserId == currentUserId {
		return true
	}

	settings, err := u.UserRepositories.GetSettings(context.Background(), targetUserId)
	if err != nil || settings == nil {
		return true
	}

	if settings.ProfileVisibility == "public" {
		return true
	}

	if settings.ProfileVisibility == "friends" {
		isFriend, _ := u.UserRepositories.GetFriendship(context.Background(), targetUserId, currentUserId)
		return isFriend
	}

	return false
}

func (u *userServices) getVisibleLastSeen(user *models.User, currentUserId uint) *time.Time {
	if currentUserId == 0 {
		return nil
	}
	if user.ID == currentUserId {
		return user.LastSeenAt
	}

	settings, err := u.UserRepositories.GetSettings(context.Background(), user.ID)
	if err != nil || settings == nil {
		return user.LastSeenAt
	}

	if settings.LastSeen == "everyone" {
		return user.LastSeenAt
	}

	if settings.LastSeen == "friends" {
		isFriend, _ := u.UserRepositories.GetFriendship(context.Background(), user.ID, currentUserId)
		if isFriend {
			return user.LastSeenAt
		}
	}

	return nil
}

// BlockUser implements [core.UserServices].
func (u *userServices) BlockUser(ctx context.Context, targetId uint) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	if userId == targetId {
		return fmt.Errorf("you cannot block yourself")
	}

	_, err := u.UserRepositories.GetById(ctx, targetId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("target user not found")
		}
		return err
	}

	alreadyBlocked, err := u.UserRepositories.IsBlocked(ctx, userId, targetId)
	if err != nil {
		return err
	}

	if alreadyBlocked {
		return errors.New("user already blocked")
	}

	block := models.Block{
		UserID:    userId,
		BlockedID: targetId,
	}

	if err := u.UserRepositories.BlockUser(ctx, &block); err != nil {
		return err
	}

	return nil
}

// UnblockUser implements [core.UserServices].
func (u *userServices) UnblockUser(ctx context.Context, targetId uint) error {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return fmt.Errorf("user_id not found")
	}

	if userId == targetId {
		return fmt.Errorf("you cannot unblock yourself")
	}

	_, err := u.UserRepositories.GetById(ctx, targetId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("target user not found")
		}
		return err
	}

	if err := u.UserRepositories.UnblockUser(ctx, userId, targetId); err != nil {
		return err
	}

	return nil
}

// GetBlockedUsers implements [core.UserServices].
func (u *userServices) GetBlockedUsers(ctx context.Context) ([]dto.UserResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	users, err := u.UserRepositories.GetBlockedUsers(ctx, userId)
	if err != nil {
		return nil, err
	}

	var response []dto.UserResponse
	for _, user := range users {
		var profilePicture string

		if user.ProfilePicture != nil {
			profilePicture = helper.NormalizeImagePath(*user.ProfilePicture, u.backendUrl, u.usersPath)
		}

		item := dto.UserResponse{
			ID:             user.ID,
			Email:          user.Email,
			ProfilePicture: profilePicture,
			Username:       user.Username,
			Name:           user.Name,
			Bio:            user.Bio,
			CreatedAt:      user.CreatedAt,
		}

		response = append(response, item)
	}

	return response, nil
}

// IsBlocked implements [core.UserServices].
func (u *userServices) IsBlocked(ctx context.Context, targetId uint) (bool, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return false, fmt.Errorf("user_id not found")
	}

	blocked, err := u.UserRepositories.IsBlocked(ctx, userId, targetId)
	if err != nil {
		return false, err
	}

	return blocked, nil
}

// GetSettings implements [core.UserServices].
func (u *userServices) GetSettings(ctx context.Context) (*dto.UserSettingsResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	settings, err := u.UserRepositories.GetSettings(ctx, userId)
	if err != nil {
		return nil, err
	}

	if settings == nil {
		return &dto.UserSettingsResponse{
			ProfileVisibility: "public",
			LastSeen:          "everyone",
			ReadReceipts:      true,
			MessageNotif:      true,
			GroupNotif:        true,
			Sound:             true,
			Preview:           true,
		}, nil
	}

	return &dto.UserSettingsResponse{
		ProfileVisibility: settings.ProfileVisibility,
		LastSeen:          settings.LastSeen,
		ReadReceipts:      settings.ReadReceipts,
		MessageNotif:      settings.MessageNotif,
		GroupNotif:        settings.GroupNotif,
		Sound:             settings.Sound,
		Preview:           settings.Preview,
	}, nil
}

// UpdateSettings implements [core.UserServices].
func (u *userServices) UpdateSettings(ctx context.Context, req *dto.UpdateUserSettingsRequest) (*dto.UserSettingsResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	settings, err := u.UserRepositories.GetSettings(ctx, userId)
	if err != nil {
		return nil, err
	}

	if settings == nil {
		settings = &models.UserSettings{
			UserID: userId,
		}
	}

	if req.ProfileVisibility != nil {
		settings.ProfileVisibility = *req.ProfileVisibility
	}
	if req.LastSeen != nil {
		settings.LastSeen = *req.LastSeen
	}
	if req.ReadReceipts != nil {
		settings.ReadReceipts = *req.ReadReceipts
	}
	if req.MessageNotif != nil {
		settings.MessageNotif = *req.MessageNotif
	}
	if req.GroupNotif != nil {
		settings.GroupNotif = *req.GroupNotif
	}
	if req.Sound != nil {
		settings.Sound = *req.Sound
	}
	if req.Preview != nil {
		settings.Preview = *req.Preview
	}

	if err := u.UserRepositories.UpsertSettings(ctx, settings); err != nil {
		return nil, err
	}

	return &dto.UserSettingsResponse{
		ProfileVisibility: settings.ProfileVisibility,
		LastSeen:          settings.LastSeen,
		ReadReceipts:      settings.ReadReceipts,
		MessageNotif:      settings.MessageNotif,
		GroupNotif:        settings.GroupNotif,
		Sound:             settings.Sound,
		Preview:           settings.Preview,
	}, nil
}
