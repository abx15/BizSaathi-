package hub

import (
	"encoding/json"
	"sync"

	"github.com/bizsaathi/realtime-service/events"
	"github.com/bizsaathi/realtime-service/metrics"
	"github.com/rs/zerolog/log"
)

type Room struct {
	TenantID string
	clients  map[string]*Client
	mu       sync.RWMutex
}

func NewRoom(tenantID string) *Room {
	return &Room{
		TenantID: tenantID,
		clients:  make(map[string]*Client),
	}
}

func (r *Room) Add(c *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.clients[c.ID] = c
}

func (r *Room) Remove(clientID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.clients, clientID)
}

func (r *Room) Size() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.clients)
}

func (r *Room) IsEmpty() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.clients) == 0
}

func (r *Room) Broadcast(event *events.Event) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if len(r.clients) == 0 {
		return
	}

	payload, err := json.Marshal(event)
	if err != nil {
		log.Error().Err(err).Msg("Error marshaling event for room broadcast")
		return
	}

	for _, client := range r.clients {
		// Non-blocking send: if the client buffer is full, we log warning and drop to keep the hub responsive.
		select {
		case client.send <- payload:
			metrics.IncrementEventsDispatched()
		default:
			metrics.IncrementMessageSendErrors()
			log.Warn().
				Str("clientId", client.ID).
				Str("userId", client.UserID).
				Str("eventType", string(event.Type)).
				Msg("Client write buffer full, dropping message to preserve responsiveness")
		}
	}
}

func (r *Room) BroadcastToUser(userID string, event *events.Event) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	payload, err := json.Marshal(event)
	if err != nil {
		log.Error().Err(err).Msg("Error marshaling event for user broadcast")
		return
	}

	for _, client := range r.clients {
		if client.UserID == userID {
			select {
			case client.send <- payload:
				metrics.IncrementEventsDispatched()
			default:
				metrics.IncrementMessageSendErrors()
				log.Warn().
					Str("clientId", client.ID).
					Str("userId", client.UserID).
					Str("eventType", string(event.Type)).
					Msg("Client write buffer full during user broadcast, dropping message")
			}
		}
	}
}
