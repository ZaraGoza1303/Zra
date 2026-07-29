package hub

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
		}
	}
}

func (h *Hub) handleSignal(message Message) {
	h.ClientMu.RLock()
	target, ok := h.GlobalClients[message.ToID]
	h.ClientMu.RUnlock()

	if !ok {
		return
	}

	select {
	case target.Send <- message:
	default:
		log.Printf("Skip signal %s for user %d: buffer full", message.Type, message.ToID)
	}
}

func (h *Hub) IsOnline(userID uint) bool {
	h.ClientMu.RLock()
	defer h.ClientMu.RUnlock()
	_, ok := h.GlobalClients[userID]
	return ok
}

func (h *Hub) OnlineMembers() ([]uint, error) {
	h.ClientMu.RLock()
	defer h.ClientMu.RUnlock()

	var onlineMember []uint
	for _, member := range h.GlobalClients {
		onlineMember = append(onlineMember, member.UserID)
	}

	return onlineMember, nil
}

func (h *Hub) GetClientById(userID uint) (*Client, bool) {
	h.ClientMu.RLock()
	defer h.ClientMu.RUnlock()

	client, ok := h.GlobalClients[userID]
	if !ok {
		return nil, false
	}

	return client, true
}

func (h *Hub) GetActiveMemberCount(roomID string) (int64, error) {
	h.RoomMu.RLock()
	defer h.RoomMu.RUnlock()

	room, ok := h.Rooms[roomID]
	if !ok {
		return 0, nil
	}

	var count int64
	for range room {
		count++
	}

	return count, nil
}

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
