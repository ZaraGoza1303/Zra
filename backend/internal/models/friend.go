package models

import "time"

type Friend struct {
	UserID    uint      `gorm:"primaryKey"`
	FriendID  uint      `gorm:"primaryKey"`
	Status    string    `gorm:"type:varchar(20);default:'none'"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`

	Sender   User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	Receiver User `gorm:"foreignKey:FriendID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}
