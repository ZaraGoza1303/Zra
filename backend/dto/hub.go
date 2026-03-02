package dto

import (
	"sync"
	"time"
)

type Hub struct {
	Clients   map[uint]*Client
	Rooms     map[string]map[*Client]bool
	Broadcast chan Message
	Join      chan *Client
	Leave     chan *Client
	RoomMu    sync.RWMutex
	ClientMu  sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		Clients:   make(map[uint]*Client),
		Rooms:     make(map[string]map[*Client]bool),
		Broadcast: make(chan Message, 256),
		Join:      make(chan *Client, 256),
		Leave:     make(chan *Client, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Join:
			h.handleJoin(client)

		case client := <-h.Leave:
			h.handleLeave(client)

		case message := <-h.Broadcast:
			h.handleBroadcast(message)
		}

	}
}

func (h *Hub) handleJoin(client *Client) {
	h.ClientMu.Lock()
	h.Clients[client.UserID] = client
	h.ClientMu.Unlock()

	h.RoomMu.Lock()
	if _, ok := h.Rooms[client.RoomID]; !ok {
		h.Rooms[client.RoomID] = make(map[*Client]bool)
	}

	h.Rooms[client.RoomID][client] = true
	h.RoomMu.Unlock()

	joinMsg := Message{
		ID:        GenerateId(),
		RoomID:    client.RoomID,
		UserID:    client.UserID,
		Username:  client.Username,
		Content:   client.Username + " joined the chat",
		TimeStamp: time.Now(),
		Type:      "join",
	}

	h.Broadcast <- joinMsg
}

func (h *Hub) handleLeave(client *Client) {
	h.ClientMu.Lock()
	delete(h.Clients, client.UserID)
	h.ClientMu.Unlock()

	h.RoomMu.Lock()
	if room, ok := h.Rooms[client.RoomID]; ok {
		delete(room, client)
		if len(room) == 0 {
			delete(h.Rooms, client.RoomID)
		}
	}
	h.RoomMu.Unlock()

	leaveMsg := Message{
		ID:        GenerateId(),
		RoomID:    client.RoomID,
		UserID:    client.UserID,
		Username:  client.Username,
		Content:   client.Username + " left the chat",
		TimeStamp: time.Now(),
		Type:      "leave",
	}

	h.Broadcast <- leaveMsg
	close(client.Send)
}

func (h *Hub) handleKick(client *Client) {
	h.ClientMu.Lock()
	delete(h.Clients, client.UserID)
	h.ClientMu.Unlock()

	h.RoomMu.Lock()
	if room, ok := h.Rooms[client.RoomID]; ok {
		delete(room, client)
		if len(room) == 0 {
			delete(h.Rooms, client.RoomID)
		}
	}
	h.RoomMu.Unlock()

	kickMsg := Message{
		ID:        GenerateId(),
		RoomID:    client.RoomID,
		UserID:    client.UserID,
		Username:  client.Username,
		Content:   client.Username + " left the chat",
		TimeStamp: time.Now(),
		Type:      "leave",
	}

	h.Broadcast <- kickMsg
	close(client.Send)
}

func (h *Hub) handleBroadcast(message Message) {
	h.RoomMu.Lock()
	roomClients, ok := h.Rooms[message.RoomID]
	h.RoomMu.Unlock()
	if !ok {
		return
	}

	for client := range roomClients {
		select {
		case client.Send <- message:
		default:
			h.Leave <- client
		}
	}
}

// Ambil yang lagi aktif
func (h *Hub) GetRoomMembers(room_id string) []uint {
	h.RoomMu.RLock()
	defer h.RoomMu.RUnlock()

	var members []uint
	if room, ok := h.Rooms[room_id]; ok {
		for client := range room {
			members = append(members, client.UserID)
		}
	}

	return members
}

func (h *Hub) RemoveUserFromRoom(room_id string, user_Id uint) {
	h.RoomMu.Lock()
	defer h.RoomMu.Unlock()

	var kickMsg Message

	if room, ok := h.Rooms[room_id]; ok {
		for client := range room {
			if client.UserID == user_Id {
				kickMsg.ID = GenerateId()
				kickMsg.RoomID = room_id
				kickMsg.UserID = user_Id
				kickMsg.Username = client.Username
				kickMsg.Content = client.Username + "Has been kicked"
				kickMsg.TimeStamp = time.Now()

				delete(room, client)
				break
			}
		}
	}

	h.Broadcast <- kickMsg
}

func GenerateId() string {
	return time.Now().Format("20060102150405") + RandomString(4)
}

func RandomString(n int) string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
