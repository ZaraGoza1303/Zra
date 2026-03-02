package dto

import "time"

type Message struct {
	ID        string    `json:"id"`
	RoomID    string    `json:"room_id"`
	UserID    uint      `json:"user_id"`
	Username  string    `json:"username"`
	Content   string    `json:"content"`
	TimeStamp time.Time `json:"time_stamp"`
	Type      string    `json:"type"`
}
