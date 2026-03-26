package models

import "time"

type UserSettings struct {
	ID                uint      `gorm:"primaryKey"`
	UserID            uint      `gorm:"uniqueIndex;not null"`
	ProfileVisibility string    `gorm:"size:20;default:'public'"`
	LastSeen          string    `gorm:"size:20;default:'everyone'"`
	ReadReceipts      bool      `gorm:"default:true"`
	MessageNotif      bool      `gorm:"default:true"`
	GroupNotif        bool      `gorm:"default:true"`
	Sound             bool      `gorm:"default:true"`
	Preview           bool      `gorm:"default:true"`
	CreatedAt         time.Time `gorm:"autoCreateTime"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime"`

	User User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}
