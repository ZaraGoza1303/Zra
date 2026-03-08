package handler

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"log"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

type webSocketHandler struct {
	hub         *dto.Hub
	roomService core.RoomServices
	userService core.UserServices
}

func NewWebSocket(router fiber.Router, hub *dto.Hub, roomService core.RoomServices, userService core.UserServices, middleware fiber.Handler) {
	handler := webSocketHandler{hub: hub, roomService: roomService, userService: userService}

	route := router.Group("/ws", middleware)
	route.Get("/:room_id", websocket.New(handler.HandleWebSocket))
}

func (h *webSocketHandler) HandleWebSocket(c *websocket.Conn) {
	userId := c.Locals("user_id").(uint)
	roomId := c.Params("room_id")

	log.Printf("User ID (%d) attempting to connect to room %s", userId, roomId)

	isMember, err := h.roomService.IsMember(roomId, userId)
	if err != nil {
		log.Printf("Error checking membership: %v", err)
		c.WriteMessage(websocket.CloseMessage, []byte("internal error"))
		c.Close()
		return
	}

	if !isMember {
		log.Printf("User %d not member of the room %s", userId, roomId)
		c.WriteMessage(websocket.CloseMessage, []byte("Not Authorized"))
		c.Close()
		return
	}

	user, err := h.userService.FindByIdWithoutCtx(userId)
	if err != nil {
		log.Printf("Error getting user data: %v", err)
		c.WriteMessage(websocket.CloseMessage, []byte("internal error"))
		c.Close()
		return
	}

	client := dto.Client{
		Conn:           c,
		UserID:         userId,
		Username:       user.Name,
		ProfilePicture: user.ProfilePicture,
		RoomID:         roomId,
		Send:           make(chan dto.Message, 256),
	}

	h.hub.Join <- &client
	go h.writePump(&client)
	h.readPump(&client)
}

func (h *webSocketHandler) readPump(client *dto.Client) {
	defer func() {
		h.hub.Leave <- client
		client.Conn.Close()
	}()

	client.Conn.SetReadLimit(4096) // Max message size
	client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {

		var msg dto.Message
		err := client.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("websocket error for user id %d : %v", client.UserID, err)
			}
			break
		}

		msg.ID = dto.GenerateId()
		msg.RoomID = client.RoomID
		msg.UserID = client.UserID
		msg.Username = client.Username
		msg.ProfilePicture = client.ProfilePicture
		msg.TimeStamp = time.Now()
		msg.Type = "chat"

		h.hub.Broadcast <- msg

		go func(m dto.Message) {
			encryptedContent, err := helper.Encrypt(m.Content)
			if err != nil {
				log.Printf("Gagal enkripsi: %v", err)
				return
			}

			dbMsg := m
			dbMsg.Content = encryptedContent

			err = h.roomService.SaveMessage(dbMsg)
			if err != nil {
				log.Printf("Gagal simpan chat ke DB: %v", err)
			}
		}(msg)
	}
}

func (h *webSocketHandler) writePump(client *dto.Client) {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			if !ok {
				client.Conn.WriteMessage(websocket.CloseMessage, []byte(""))
				return
			}

			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			err := client.Conn.WriteJSON(message)
			if err != nil {
				log.Printf("Error writing to websocket for user %s: %v", client.Username, err)
				return
			}

		case <-ticker.C:
			// untuk ping biar connection tetep nyala
			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		}
	}
}
