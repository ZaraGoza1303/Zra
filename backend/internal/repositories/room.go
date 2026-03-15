package repositories

import (
	"chatapp/core"
	"chatapp/internal/models"
	"context"
	"errors"
	"time"

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

	query = query.Preload("Members").
		Preload("Members.User").
		Joins("INNER JOIN room_members ON room_members.room_id = rooms.id").
		Joins("LEFT JOIN messages ON messages.room_id = rooms.id").
		Group("rooms.id").
		Order("MAX(messages.created_at) DESC").
		Where("room_members.user_id = ?", user_id)

	if filter != "" {
		query = query.Where(
			"rooms.name LIKE ? OR (rooms.type = 'private' AND EXISTS (SELECT 1 FROM room_members rm2 JOIN users u ON u.id = rm2.user_id WHERE rm2.room_id = rooms.id AND rm2.user_id != ? AND u.username LIKE ?))",
			"%"+filter+"%", user_id, "%"+filter+"%",
		)
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

// UpdateReadMessages implements [core.RoomRepositories].
func (r *roomRepositories) UpdateReadMessages(ctx context.Context, room_id string, user_id uint, timeStamp time.Time) error {
	result := r.DB.WithContext(ctx).Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", room_id, user_id).
		Update("last_read_at", timeStamp)

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

// GetPrivateRoom implements [core.RoomRepositories].
func (r *roomRepositories) GetIdPrivateRoom(ctx context.Context, userID uint, targetID uint) (string, error) {
	var roomID string

	err := r.DB.WithContext(ctx).Table("rooms").
		Select("rooms.id").
		Joins("JOIN room_members rm ON rm.room_id = rooms.id").
		Where("rooms.type = 'private'").
		Where("rm.user_id IN (?, ?)", userID, targetID).
		Group("rooms.id").
		Having("COUNT(DISTINCT rm.user_id) = 2").
		Scan(&roomID).Error

	if err != nil {
		return "", err
	}

	if roomID == "" {
		return "", gorm.ErrRecordNotFound
	}

	return roomID, nil
}

// InsertPrivateRoom implements [core.RoomRepositories].
func (r *roomRepositories) InsertPrivateRoom(ctx context.Context, room *models.Room, user_id []uint) error {
	return r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Double-check di dalam transaksi
		var existingRoom models.Room
		err := tx.
			Joins("JOIN room_members rm1 ON rm1.room_id = rooms.id AND rm1.user_id = ?", user_id[0]).
			Joins("JOIN room_members rm2 ON rm2.room_id = rooms.id AND rm2.user_id = ?", user_id[1]).
			Where("rooms.type = ?", "private").
			First(&existingRoom).Error

		if err == nil {
			// Room sudah ada, return ID-nya
			room.ID = existingRoom.ID
			return nil
		}

		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		if err := tx.Create(&room).Error; err != nil {
			return err
		}

		var members []models.RoomMember
		for _, id := range user_id {
			members = append(members, models.RoomMember{
				RoomID: room.ID,
				UserID: id,
			})
		}

		return tx.Create(&members).Error
	})
}

// GetMemberCount implements [core.RoomRepositories].
func (r *roomRepositories) GetMemberCount(ctx context.Context, room_id string) (int64, error) {
	var memberCount int64

	result := r.DB.WithContext(ctx).Model(&models.RoomMember{}).
		Where("room_id = ?", room_id).
		Count(&memberCount)

	if result.Error != nil {
		return 0, result.Error
	}

	return memberCount, nil
}

// GetUnreadMessagesCount implements [core.RoomRepositories].
func (r *roomRepositories) GetUnreadMessagesCount(ctx context.Context, room_id string, user_id uint) (int64, error) {
	var messagesCount int64

	result := r.DB.WithContext(ctx).Model(&models.Message{}).
		Joins("JOIN room_members ON room_members.room_id = messages.room_id AND room_members.user_id = ?", user_id).
		Where("messages.room_id = ? AND messages.created_at > room_members.last_read_at AND messages.user_id != ?", room_id, user_id).
		Count(&messagesCount)

	if result.Error != nil {
		return 0, result.Error
	}

	return messagesCount, nil
}

// GetLastMessages implements [core.RoomRepositories].
func (r *roomRepositories) GetLastMessages(ctx context.Context, roomIds []string) ([]models.Message, error) {
	var messages []models.Message

	result := r.DB.WithContext(ctx).
		Preload("User").
		Where("id IN (?)",
			r.DB.Model(&models.Message{}).
				Select("MAX(id)").
				Where("room_id IN ?", roomIds).
				Group("room_id"),
		).
		Find(&messages)

	if result.Error != nil {
		return nil, result.Error
	}

	return messages, nil
}

// MarkMessageRead implements [core.RoomRepositories].
func (r *roomRepositories) MarkMessageRead(ctx context.Context, room_id string, user_id uint) error {
	result := r.DB.WithContext(ctx).Model(&models.Message{}).
		Where("room_id = ? AND user_id != ? AND is_read = false", room_id, user_id).
		Update("is_read", true)

	if result.Error != nil {
		return result.Error
	}

	return nil
}

// GetChatHistory implements [core.RoomRepositories].
func (r *roomRepositories) GetChatHistory(ctx context.Context, room_id string, limit int, lastTimestamp time.Time) ([]models.Message, error) {
	var messages []models.Message

	query := r.DB.WithContext(ctx).
		Preload("ReplyTo").
		Where("room_id = ?", room_id).
		Order("created_at DESC").
		Limit(limit)

	if !lastTimestamp.IsZero() {
		query = query.Where("created_at < ?", lastTimestamp)
	}

	result := query.Find(&messages)
	if result.Error != nil {
		return nil, result.Error
	}

	// Balik urutan: FE expect ASC (lama → baru)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
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
