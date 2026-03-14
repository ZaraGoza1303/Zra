package models

import "time"

type RoomMember struct {
	RoomID     string    `gorm:"primaryKey;not null"`
	UserID     uint      `gorm:"primaryKey;not null"`
	Role       string    `gorm:"size:255"`
	JoinedAt   time.Time `gorm:"autoCreateTime"`
	LastReadAt time.Time `gorm:"autoCreateTime"`

	Room Room `gorm:"foreignKey:RoomID;references:ID;constraint:OnDelete:CASCADE"`
	User User `gorm:"foreignKey:UserID;references:ID"`
}
