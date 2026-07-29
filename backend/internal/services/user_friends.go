package services

import (
	"chatapp/hub"
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

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
			Email:          "", // Email never exposed in friend request lists
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

	requestMsg := hub.Message{
		ID:        hub.GenerateId(),
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

	accMsg := hub.Message{
		ID:        hub.GenerateId(),
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

	rejectMsg := hub.Message{
		ID:        hub.GenerateId(),
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
func (u *userServices) GetBlockedUsers(ctx context.Context, limit, cursor int) ([]dto.UserResponse, *uint, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, nil, fmt.Errorf("user_id not found")
	}

	users, nextCursor, err := u.UserRepositories.GetBlockedUsers(ctx, userId, limit, cursor)
	if err != nil {
		return nil, nil, err
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

	return response, nextCursor, nil
}
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
