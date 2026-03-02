package dto

import "github.com/gofiber/contrib/websocket"

type Client struct {
	Conn     *websocket.Conn
	UserID   uint
	Username string
	RoomID   string
	Send     chan Message
}
