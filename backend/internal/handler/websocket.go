package handler

import (
	"chatapp/core"
	"chatapp/dto"
	"chatapp/internal/helper"
	"context"
	"log"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

type webSocketHandler struct {
	hub                *dto.Hub
	roomService        core.RoomServices
	cachedRoomServices core.RoomServices
	userService        core.UserServices
	saveSem            chan struct{}
}

func NewWebSocket(router fiber.Router, hub *dto.Hub, roomService core.RoomServices, cachedRoomServices core.RoomServices, userService core.UserServices, middleware fiber.Handler) {
	handler := webSocketHandler{
		hub:                hub,
		roomService:        roomService,
		cachedRoomServices: cachedRoomServices,
		userService:        userService,
		saveSem:            make(chan struct{}, 20),
	}

	route := router.Group("/ws", middleware)
	route.Get("/global", websocket.New(handler.HandleGlobalWebSocket))
	route.Get("/:room_id", websocket.New(handler.HandleWebSocket))
}

func (h *webSocketHandler) HandleGlobalWebSocket(c *websocket.Conn) {
	userId := c.Locals("user_id").(uint)

	user, err := h.userService.FindByIdWithoutCtx(userId)
	if err != nil {
		c.Close()
		return
	}

	client := dto.Client{
		Conn:           c,
		UserID:         userId,
		Username:       user.Name,
		ProfilePicture: user.ProfilePicture,
		RoomID:         "global",
		Send:           make(chan dto.Message, 256),
	}

	h.hub.Join <- &client
	go h.writePump(&client)
	go func() {
		time.Sleep(2000 * time.Millisecond)

		members, err := h.roomService.GetAllRoomMembersByUserId(context.Background(), userId)
		if err != nil {
			return
		}

		for _, memberId := range members {
			if memberId != userId {
				h.hub.Signal <- dto.Message{
					Type:   "user-online",
					UserID: userId,
					ToID:   memberId,
				}
			}
		}
	}()
	h.readPumpGlobal(&client)
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

func (h *webSocketHandler) readPumpGlobal(client *dto.Client) {
	defer func() {
		h.hub.ClientMu.Lock()
		if existing, ok := h.hub.GlobalClients[client.UserID]; ok && existing == client {
			delete(h.hub.GlobalClients, client.UserID)
		}
		h.hub.ClientMu.Unlock()

		h.hub.Leave <- client
		client.Conn.Close()

		go func() {
			time.Sleep(2000 * time.Millisecond)

			if h.hub.IsOnline(client.UserID) {
				return
			}

			members, err := h.roomService.GetAllRoomMembersByUserId(context.Background(), client.UserID)
			if err != nil {
				return
			}

			for _, memberId := range members {
				if memberId != client.UserID {
					h.hub.Signal <- dto.Message{
						Type:   "user-offline",
						UserID: client.UserID,
						ToID:   memberId,
					}
				}
			}
		}()
	}()

	client.Conn.SetReadLimit(65536)
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
				log.Printf("global ws error user %d: %v", client.UserID, err)
			}
			break
		}

		// Set sender info
		msg.UserID = client.UserID
		msg.Username = client.Username
		msg.ProfilePicture = client.ProfilePicture

		// Forward WebRTC signals ke target user via GlobalClients
		switch msg.Type {
		case "call-offer", "call-answer", "ice-candidate", "call-rejected", "call-ended", "call-busy", "call-mute-toggle":
			log.Printf("Global signal [%s] dari user %d ke user %d", msg.Type, client.UserID, msg.ToID)
			h.hub.Signal <- msg
		default:
			log.Printf("Unknown global message type: %s", msg.Type)
		}
	}
}

func (h *webSocketHandler) readPump(client *dto.Client) {
	defer func() {
		h.hub.Leave <- client
		client.Conn.Close()
	}()

	client.Conn.SetReadLimit(65536)
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

		if msg.Type == "" {
			msg.Type = "chat"
		}

		if msg.ReplyToID != "" {
			replyMsg, err := h.roomService.FindMessageByID(context.Background(), msg.ReplyToID)
			if err == nil && replyMsg != nil {
				msg.ReplyTo = replyMsg
			}
		}

		h.hub.Broadcast <- msg

		go func(msg dto.Message) {
			members, err := h.cachedRoomServices.GetAllRoomMembers(context.Background(), msg.RoomID)
			if err != nil {
				log.Printf("Failed to get members: %v", err)
				return
			}
			for _, member := range members {
				if member.UserID != msg.UserID {
					msg.ToID = member.UserID
					h.hub.Signal <- msg
				}
			}
		}(msg)

		go func(msg dto.Message) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Panic saat save message: %v", r)
				}
			}()

			h.saveSem <- struct{}{}
			defer func() { <-h.saveSem }()

			encryptedContent, err := helper.Encrypt(msg.Content)
			if err != nil {
				log.Printf("Gagal enkripsi: %v", err)
				return
			}

			encryptedCaption, err := helper.Encrypt(msg.Caption)
			if err != nil {
				log.Printf("Gagal enkripsi: %v", err)
				return
			}

			msg.Content = encryptedContent
			msg.Caption = encryptedCaption
			if err := h.roomService.SaveMessage(msg); err != nil {
				log.Printf("Gagal simpan chat ke DB: %v", err)
			}

			h.hub.Broadcast <- dto.Message{
				ID:       msg.ID,
				RoomID:   msg.RoomID,
				UserID:   msg.UserID,
				Username: msg.Username,
				Type:     "sent",
			}
		}(msg)
	}
}

func (h *webSocketHandler) writePump(client *dto.Client) {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from writePump panic: %v", r)
		}
		ticker.Stop()
		if client.Conn != nil {
			client.Conn.Close()
		}
	}()

	for {
		select {
		case message, ok := <-client.Send:
			if client.Conn == nil {
				return
			}

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
			if client.Conn == nil {
				return
			}

			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
