package hub

import (
	"sync"

	"github.com/gofiber/contrib/websocket"
)

type Client struct {
	Conn           *websocket.Conn
	UserID         uint
	Username       string
	Name           string
	ProfilePicture string
	RoomID         string
	Send           chan Message
	CloseOnce      sync.Once
}
