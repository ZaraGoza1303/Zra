package models

import "time"

type User struct {
	ID             uint      `gorm:"primaryKey"`
	ProfilePicture *string   `gorm:"size:255"`
	Email          string    `gorm:"size:255;not null;unique"`
	Provider       *string   `gorm:"size:255"`
	Bio            string    `gorm:"size:255"`
	Username       string    `gorm:"size:255;not null;unique"`
	Name           string    `gorm:"size:255"`
	Password       string    `gorm:"size:255;not null"`
	IsVerified     bool      `gorm:"default:false;not null"`
	VerifyToken    *string   `gorm:"type:text"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime"`

	Room           []Room          `gorm:"foreignKey:OwnerID"`
	PasswordResets []PasswordReset `gorm:"foreignKey:UserID"`
	RefreshToken   []UserToken     `gorm:"foreignKey:UserID"`
}
