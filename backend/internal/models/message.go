package models

import "time"

type Message struct {
	ID             string    `gorm:"primaryKey"`
	RoomID         string    `gorm:"not null"`
	UserID         uint      `gorm:"not null"`
	Username       string    `gorm:"size:255"`
	ProfilePicture string    `gorm:"size:255"`
	Content        string    `gorm:"type:text"`
	Type           string    `gorm:"size:255"`
	IsRead         bool      `gorm:"default:false"`
	ReplyToID      *string   `gorm:"size:255"`
	Caption        string    `gorm:"size:255"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`

	ReplyTo *Message `gorm:"foreignKey:ReplyToID;constraint:OnDelete:CASCADE"`
	Room    Room     `gorm:"foreignKey:RoomID;references:ID;constraint:OnDelete:CASCADE"`
	User    User     `gorm:"foreignKey:UserID;references:ID"`
}
