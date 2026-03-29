package dto

import (
	"time"
)

type Message struct {
	ID              string      `json:"id"`
	LocalID         string      `json:"local_id,omitempty"`
	RoomID          string      `json:"room_id"`
	UserID          uint        `json:"user_id"`
	ToID            uint        `json:"to_id,omitempty"`
	Username        string      `json:"username"`
	Name            string      `json:"name"`
	ProfilePicture  string      `json:"profile_picture"`
	Content         string      `json:"content"`
	Type            string      `json:"type"`
	IsRead          bool        `json:"is_read"`
	Caption         string      `json:"caption,omitempty"`
	FileName        string      `json:"file_name,omitempty"`
	ReplyToID       string      `json:"reply_to_id,omitempty"`
	ReplyTo         *Message    `json:"reply_to,omitempty"`
	SDP             interface{} `json:"sdp,omitempty"`
	WithVideo       bool        `json:"with_video,omitempty"`
	Candidate       interface{} `json:"candidate,omitempty"`
	Muted           bool        `json:"muted,omitempty"`
	EditedMessageID string      `json:"edited_message_id,omitempty"`
	TimeStamp       time.Time   `json:"time_stamp"`
}

type MultipleMsgDeleteReq struct {
	MessageIDs []string `json:"message_ids"`
}

type MessageUpdateRequest struct {
	Content string `form:"content" json:"content" validate:"required"`
	Caption string `form:"caption" json:"caption,omitempty"`
}
