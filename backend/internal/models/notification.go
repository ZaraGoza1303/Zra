package models

type Notification struct {
	ID      uint   `gorm:"primaryKey"`
	UserID  uint   `gorm:"primaryKey"`
	Type    string `gorm:"size:255"`
	Content string `gorm:"size:255"`
	IsRead  bool   `gorm:"default:false"`
}
