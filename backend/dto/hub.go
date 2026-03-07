package dto

import (
	"math/rand"
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

func (h *Hub) GetClientById(user_id uint) (*Client, bool) {
	h.ClientMu.RLock()
	defer h.ClientMu.RUnlock()

	client, ok := h.Clients[user_id]
	if !ok {
		return nil, false
	}

	return client, true
}

func (h *Hub) GetActiveMemberCount(room_id string) (int64, error) {
	h.RoomMu.RLock()
	defer h.RoomMu.RUnlock()

	room, ok := h.Rooms[room_id]
	if !ok {
		return 0, nil
	}

	var count int64
	for _, isActive := range room {
		if isActive {
			count++
		}
	}

	return count, nil
}

func GenerateId() string {
	return time.Now().Format("20060102150405") + RandomString(4)
}

func RandomString(n int) string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
