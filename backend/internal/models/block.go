package models

import "time"

type Block struct {
	UserID    uint      `gorm:"primaryKey"`
	BlockedID uint      `gorm:"primaryKey"`
	CreatedAt time.Time `gorm:"autoCreateTime"`

	User    User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	Blocked User `gorm:"foreignKey:BlockedID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}
