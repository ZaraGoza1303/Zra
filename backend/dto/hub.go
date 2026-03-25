package dto

import (
	"log"
	"math/rand"
	"sync"
	"time"
)

type Hub struct {
	Clients       map[uint]*Client
	GlobalClients map[uint]*Client
	Rooms         map[string]map[*Client]bool
	Broadcast     chan Message
	Join          chan *Client
	Leave         chan *Client
	Signal        chan Message
	RoomMu        sync.RWMutex
	ClientMu      sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		Clients:       make(map[uint]*Client),
		GlobalClients: make(map[uint]*Client),
		Rooms:         make(map[string]map[*Client]bool),
		Broadcast:     make(chan Message, 256),
		Join:          make(chan *Client, 256),
		Leave:         make(chan *Client, 256),
		Signal:        make(chan Message, 256),
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

		case message := <-h.Signal:
			h.handleSignal(message)
		}

	}
}

func (h *Hub) handleJoin(client *Client) {
	if client.RoomID == "global" {
		// Hanya global WS yang masuk GlobalClients
		h.ClientMu.Lock()
		h.GlobalClients[client.UserID] = client
		h.ClientMu.Unlock()
	} else {
		// Room WS hanya masuk Rooms map
		h.RoomMu.Lock()
		if h.Rooms[client.RoomID] == nil {
			h.Rooms[client.RoomID] = make(map[*Client]bool)
		}
		h.Rooms[client.RoomID][client] = true
		h.RoomMu.Unlock()
	}
}

func (h *Hub) handleLeave(client *Client) {
	if client.RoomID == "global" {
		h.ClientMu.Lock()
		if existing, ok := h.GlobalClients[client.UserID]; ok && existing == client {
			delete(h.GlobalClients, client.UserID)
		}
		h.ClientMu.Unlock()
	} else {
		h.RoomMu.Lock()
		delete(h.Rooms[client.RoomID], client)
		h.RoomMu.Unlock()
	}
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

		}
	}
}

func (h *Hub) handleSignal(message Message) {
	h.ClientMu.RLock()
	target, ok := h.GlobalClients[message.ToID]
	h.ClientMu.RUnlock()

	if !ok {
		if message.Type == "user-offline" || message.Type == "user-online" {
			log.Printf("handleSignal [%s] aborted: User %d is not in GlobalClients", message.Type, message.ToID)
		}
		return
	}

	// Skip kalau target lagi aktif di room yang sama (udah nerima dari Broadcast)
	if message.Type == "chat" || message.Type == "message_notification" {
		h.RoomMu.RLock()
		roomClients := h.Rooms[message.RoomID]
		for client := range roomClients {
			if client.UserID == message.ToID {
				h.RoomMu.RUnlock()
				return // udah nerima dari broadcast, skip
			}
		}
		h.RoomMu.RUnlock()
	}

	select {
	case target.Send <- message:
		if message.Type == "user-offline" || message.Type == "user-online" || message.Type == "call-busy" {
			log.Printf("handleSignal [%s] successfully put in channel target.Send for user %d", message.Type, message.ToID)
		}
	default:
		log.Printf("Skip signal %s for user %d: buffer full", message.Type, message.ToID)
	}
}

// Cek user yang lagi aktif
func (h *Hub) IsOnline(userID uint) bool {
	h.ClientMu.RLock()
	defer h.ClientMu.RUnlock()
	_, ok := h.GlobalClients[userID]
	return ok
}

// Ambil semua user id yang lagi aktif
func (h *Hub) OnlineMembers() ([]uint, error) {
	h.ClientMu.RLock()
	defer h.ClientMu.RUnlock()

	var onlineMember []uint

	for _, member := range h.GlobalClients {
		onlineMember = append(onlineMember, member.UserID)
	}

	return onlineMember, nil
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
