package dto

import (
	"log"
	"math/rand"
	"sync"

	"github.com/google/uuid"
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
		h.ClientMu.Lock()
		h.GlobalClients[client.UserID] = client
		h.ClientMu.Unlock()
	} else {
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
		if _, ok := h.Rooms[client.RoomID]; ok {
			delete(h.Rooms[client.RoomID], client)
		}
		h.RoomMu.Unlock()
	}

	// Close channel dengan safe — pastikan cuma sekali
	client.CloseOnce.Do(func() {
		close(client.Send)
	})
}

func (h *Hub) handleBroadcast(message Message) {
	h.RoomMu.RLock()
	roomClients, ok := h.Rooms[message.RoomID]
	h.RoomMu.RUnlock()
	if !ok {
		return
	}

	for client := range roomClients {
		select {
		case client.Send <- message:
		default:
			// skip kalo buffer penuh, gak usah ngeprint biar gak spam log
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

	select {
	case target.Send <- message:
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

// Fix: Clients map gak pernah diisi, ganti pake GlobalClients
func (h *Hub) GetClientById(user_id uint) (*Client, bool) {
	h.ClientMu.RLock()
	defer h.ClientMu.RUnlock()

	client, ok := h.GlobalClients[user_id]
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

// Pake UUID biar gak ada collision
func GenerateId() string {
	return uuid.New().String()
}

func RandomString(n int) string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
