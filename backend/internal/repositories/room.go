package repositories

import (
	"chatapp/core"
	"chatapp/internal/models"
	"context"

	"gorm.io/gorm"
)

type roomRepositories struct {
	DB *gorm.DB
}

func NewRoom(db *gorm.DB) core.RoomRepositories {
	return &roomRepositories{
		DB: db,
	}
}

// GetAll implements [core.RoomRepositories].
func (r *roomRepositories) GetAll(ctx context.Context, filter string, user_id uint) ([]models.Room, error) {
	var rooms []models.Room

	query := r.DB.WithContext(ctx).Model(&models.Room{})

	query = query.Joins("INNER JOIN room_members ON room_members.room_id = rooms.id").
		Where("room_members.user_id = ?", user_id)

	if filter != "" {
		query = query.Where("rooms.name LIKE ?", "%"+filter+"%")
	}

	result := query.Find(&rooms)
	if result.Error != nil {
		return nil, result.Error
	}

	return rooms, nil
}

// GetById implements [core.RoomRepositories].
func (r *roomRepositories) GetById(ctx context.Context, room_id string) (*models.Room, error) {
	var room models.Room

	result := r.DB.WithContext(ctx).
		Where("id = ?", room_id).
		First(&room)

	if result.Error != nil {
		return nil, result.Error
	}

	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &room, nil
}

// Insert implements [core.RoomRepositories].
func (r *roomRepositories) Insert(ctx context.Context, room *models.Room) error {
	result := r.DB.WithContext(ctx).Create(room)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// Update implements [core.RoomRepositories].
func (r *roomRepositories) Update(ctx context.Context, room_id string, roomReq *models.Room) error {
	result := r.DB.WithContext(ctx).Where("id = ?", room_id).Updates(roomReq)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// Delete implements [core.RoomRepositories].
func (r *roomRepositories) Delete(ctx context.Context, room_id string) error {
	result := r.DB.WithContext(ctx).
		Where("id = ?", room_id).
		Delete(&models.Room{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// GetByLink implements [core.RoomRepositories].
func (r *roomRepositories) GetByLink(ctx context.Context, room_link string) (*models.Room, error) {
	var room models.Room
	result := r.DB.WithContext(ctx).Model(&models.Room{}).Where("room_link = ?", room_link).First(&room)
	if result.Error != nil {
		return nil, result.Error
	}

	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &room, nil
}

// InsertRoomMembers implements [core.RoomRepositories].
func (r *roomRepositories) InsertRoomMembers(ctx context.Context, member *models.RoomMember) error {
	result := r.DB.WithContext(ctx).Create(&member)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// IsMember implements [core.RoomRepositories].
func (r *roomRepositories) IsMember(ctx context.Context, room_id string, user_id uint) (bool, error) {
	var exists bool

	result := r.DB.WithContext(ctx).
		Model(&models.RoomMember{}).
		Select("count(*) > 0").
		Where("room_id = ? AND user_id = ?", room_id, user_id).
		Find(&exists)

	if result.Error != nil {
		return false, result.Error
	}

	return exists, nil
}

// IsAdmin implements [core.RoomRepositories].
func (r *roomRepositories) IsAdmin(ctx context.Context, room_id string, user_id uint) (bool, error) {
	var isAdmin bool

	result := r.DB.WithContext(ctx).
		Model(&models.RoomMember{}).
		Select("count(*) > 0").
		Where("room_id = ? AND user_id = ? AND role = 'admin'", room_id, user_id).
		Find(&isAdmin)

	if result.Error != nil {
		return false, result.Error
	}

	return isAdmin, nil
}

// UpdateToAdmin implements [core.RoomRepositories].
func (r *roomRepositories) UpdateToAdmin(ctx context.Context, room_id string, user_id uint) error {
	result := r.DB.WithContext(ctx).
		Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", room_id, user_id).
		Update("role", "admin")

	if result.Error != nil {
		return result.Error
	}

	return nil
}

// DeleteUser implements [core.RoomRepositories].
func (r *roomRepositories) DeleteUser(ctx context.Context, room_id string, user_id uint) error {
	result := r.DB.WithContext(ctx).
		Where("room_id = ? AND user_id = ?", room_id, user_id).
		Delete(&models.RoomMember{})

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// GetAllRoomMembers implements [core.RoomRepositories].
func (r *roomRepositories) GetAllRoomMembers(ctx context.Context, room_id string) ([]models.RoomMember, error) {
	var members []models.RoomMember

	result := r.DB.WithContext(ctx).Where("room_id = ?", room_id).
		Preload("User").
		Model(&models.RoomMember{}).
		Find(&members)

	if result.Error != nil {
		return nil, result.Error
	}

	return members, nil
}

// GetChatHistory implements [core.RoomRepositories].
func (r *roomRepositories) GetChatHistory(ctx context.Context, room_id string, limit int) ([]models.Message, error) {
	var messages []models.Message

	result := r.DB.WithContext(ctx).Where("room_id = ?", room_id).Order("created_at desc").Limit(limit).
		Find(&messages)

	if result.Error != nil {
		return nil, result.Error
	}

	return messages, nil
}

// SaveMessage implements [core.RoomRepositories].
func (r *roomRepositories) SaveMessage(msg models.Message) error {
	result := r.DB.Create(&msg)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}
