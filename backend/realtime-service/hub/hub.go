package hub

import (
	"context"
	"sync"
	"sync/atomic"

	"github.com/bizsaathi/realtime-service/events"
	"github.com/rs/zerolog/log"
)

type HubStats struct {
	TotalRooms     int            `json:"totalRooms"`
	TotalClients   int            `json:"totalClients"`
	ClientsPerRoom map[string]int `json:"clientsPerRoom"`
}

type BroadcastMessage struct {
	TenantID string
	UserID   string
	Event    *events.Event
}

type Hub struct {
	rooms      map[string]*Room
	mu         sync.RWMutex
	register   chan *Client
	unregister chan *Client
	broadcast  chan *BroadcastMessage

	// Metrics
	totalConnections int64
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]*Room),
		register:   make(chan *Client, 1024),
		unregister: make(chan *Client, 1024),
		broadcast:  make(chan *BroadcastMessage, 4096),
	}
}

func (h *Hub) Run(ctx context.Context) {
	log.Info().Msg("Starting WebSocket Hub connection manager...")
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("WebSocket Hub shutting down...")
			return

		case client := <-h.register:
			h.handleRegister(client)

		case client := <-h.unregister:
			h.handleUnregister(client)

		case bm := <-h.broadcast:
			h.handleBroadcast(bm)
		}
	}
}

func (h *Hub) Register(c *Client) {
	h.register <- c
}

func (h *Hub) Unregister(c *Client) {
	h.unregister <- c
}

func (h *Hub) BroadcastToTenant(tenantID string, event *events.Event) {
	h.broadcast <- &BroadcastMessage{
		TenantID: tenantID,
		Event:    event,
	}
}

func (h *Hub) BroadcastToUser(userID string, event *events.Event) {
	h.broadcast <- &BroadcastMessage{
		UserID: userID,
		Event:  event,
	}
}

func (h *Hub) BroadcastToAll(event *events.Event) {
	h.broadcast <- &BroadcastMessage{
		Event: event,
	}
}

func (h *Hub) handleRegister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room, exists := h.rooms[c.TenantID]
	if !exists {
		room = NewRoom(c.TenantID)
		h.rooms[c.TenantID] = room
	}

	room.Add(c)
	atomic.AddInt64(&h.totalConnections, 1)

	log.Debug().
		Str("clientId", c.ID).
		Str("userId", c.UserID).
		Str("tenantId", c.TenantID).
		Msg("Client registered successfully in Hub")
}

func (h *Hub) handleUnregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room, exists := h.rooms[c.TenantID]
	if exists {
		room.Remove(c.ID)
		if room.IsEmpty() {
			delete(h.rooms, c.TenantID)
		}
		atomic.AddInt64(&h.totalConnections, -1)
	}

	log.Debug().
		Str("clientId", c.ID).
		Str("userId", c.UserID).
		Str("tenantId", c.TenantID).
		Msg("Client unregistered successfully from Hub")
}

func (h *Hub) handleBroadcast(bm *BroadcastMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if bm.UserID != "" {
		// Target specific user (across all rooms/tenants)
		for _, room := range h.rooms {
			room.BroadcastToUser(bm.UserID, bm.Event)
		}
	} else if bm.TenantID != "" {
		// Broadcast to all users in tenant room
		if room, exists := h.rooms[bm.TenantID]; exists {
			room.Broadcast(bm.Event)
		}
	} else {
		// Broadcast to everyone (system-wide)
		for _, room := range h.rooms {
			room.Broadcast(bm.Event)
		}
	}
}

func (h *Hub) GetStats() HubStats {
	h.mu.RLock()
	defer h.mu.RUnlock()

	totalRooms := len(h.rooms)
	clientsPerRoom := make(map[string]int)
	totalClients := 0

	for tenantID, room := range h.rooms {
		size := room.Size()
		clientsPerRoom[tenantID] = size
		totalClients += size
	}

	return HubStats{
		TotalRooms:     totalRooms,
		TotalClients:   totalClients,
		ClientsPerRoom: clientsPerRoom,
	}
}

func (h *Hub) GetActiveConnectionsCount() int64 {
	return atomic.LoadInt64(&h.totalConnections)
}
