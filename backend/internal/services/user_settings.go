package services

import (
	"chatapp/dto"
	"chatapp/internal/helper"
	"chatapp/internal/models"
	"context"
	"fmt"
	"log"
	"time"
)

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
func (u *userServices) UpdateSettings(ctx context.Context, req *dto.UpdateUserSettingsRequest) (*dto.UserSettingsResponse, error) {
	userId, ok := ctx.Value("user_id").(uint)
	if !ok {
		return nil, fmt.Errorf("user_id not found")
	}

	if req.ReadReceipts != nil {
		log.Printf("[UpdateSettings] userId=%d, req.ReadReceipts=%v", userId, *req.ReadReceipts)
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
func (u *userServices) FindOnlineUsers() ([]uint, error) {
	users, err := u.hub.OnlineMembers()
	if err != nil {
		return nil, err
	}

	return users, nil
}
func (u *userServices) UpdateLastSeen(userId uint) error {
	now := time.Now()
	update := models.User{
		LastSeenAt: &now,
	}
	return u.UserRepositories.Update(context.Background(), userId, &update)
}
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

		social = &socialRequest
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
