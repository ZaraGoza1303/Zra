package dto

import "time"

type Message struct {
	ID             string      `json:"id"`
	RoomID         string      `json:"room_id"`
	UserID         uint        `json:"user_id"`
	ToID           uint        `json:"to_id,omitempty"`
	Username       string      `json:"username"`
	ProfilePicture string      `json:"profile_picture"`
	Content        string      `json:"content"`
	Type           string      `json:"type"`
	SDP            interface{} `json:"sdp,omitempty"`
	WithVideo      bool        `json:"with_video,omitempty"`
	Candidate      interface{} `json:"candidate,omitempty"`
	TimeStamp      time.Time   `json:"time_stamp"`
}
