package models

import "time"

type Sticker struct {
	ID uint `gorm:"primaryKey"`
	Name string `gorm:"name"`
	Category string `gorm:"size:100"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}