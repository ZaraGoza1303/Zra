package models

import "time"

type Room struct {
	ID          string    `gorm:"primaryKey"`
	OwnerID     uint      `gorm:"not null"`
	Picture     *string   `gorm:"size:255"`
	Name        string    `gorm:"size:255"`
	Description *string   `gorm:"type:text"`
	RoomLink    string    `gorm:"type:text;index:idx_room_link,unique"`
	Type        string    `gorm:"type:varchar(20);default:'group'"`
	CreatedAt   time.Time `gorm:"autoCreateTime"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime"`

	User User `gorm:"foreignKey:OwnerID;references:ID;constraint:OnDelete:CASCADE"`
}
