package hub

import (
	"context"
	"encoding/json"
	"time"

	"github.com/coder/websocket"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

type Client struct {
	ID       string
	UserID   string
	TenantID string
	Role     string
	conn     *websocket.Conn
	hub      *Hub
	send     chan []byte
	done     chan struct{}
}

func NewClient(conn *websocket.Conn, userID, tenantID, role string, hub *Hub) *Client {
	return &Client{
		ID:       uuid.New().String(),
		UserID:   userID,
		TenantID: tenantID,
		Role:     role,
		conn:     conn,
		hub:      hub,
		send:     make(chan []byte, 256),
		done:     make(chan struct{}),
	}
}

func (c *Client) GetSendChannel() chan []byte {
	return c.send
}

func (c *Client) Start(ctx context.Context) {
	// Register with Hub
	c.hub.Register(c)

	// Launch read and write pumps in separate goroutines
	go c.writePump(ctx)
	go c.readPump(ctx)
}

func (c *Client) Close() {
	select {
	case <-c.done:
		// already closed
		return
	default:
		close(c.done)
	}

	c.hub.Unregister(c)
	c.conn.Close(websocket.StatusNormalClosure, "Client disconnected")
}

func (c *Client) readPump(ctx context.Context) {
	defer func() {
		c.Close()
	}()

	// 10,000+ connections rule: keep timeout deadlines active
	c.conn.SetReadLimit(4096) // 4KB input limit

	for {
		select {
		case <-ctx.Done():
			return
		case <-c.done:
			return
		default:
			_, data, err := c.conn.Read(ctx)
			if err != nil {
				log.Debug().Err(err).Str("clientId", c.ID).Msg("WebSocket read error (closing connection)")
				return
			}

			// Parse message protocol (e.g. heartbeat or subscriptions)
			var msg struct {
				Type   string   `json:"type"`
				Events []string `json:"events,omitempty"`
			}

			if err := json.Unmarshal(data, &msg); err != nil {
				log.Warn().Err(err).Str("clientId", c.ID).Msg("Failed to unmarshal client frame")
				continue
			}

			if msg.Type == "ping" {
				pongPayload, _ := json.Marshal(map[string]interface{}{
					"type":      "pong",
					"timestamp": time.Now().Format(time.RFC3339),
				})
				select {
				case c.send <- pongPayload:
				default:
				}
			}
		}
	}
}

func (c *Client) writePump(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Close()
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case <-c.done:
			return
		case message, ok := <-c.send:
			if !ok {
				return
			}

			// Set write deadline for network safety
			writeCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			err := c.conn.Write(writeCtx, websocket.MessageText, message)
			cancel()

			if err != nil {
				log.Debug().Err(err).Str("clientId", c.ID).Msg("WebSocket write error (closing connection)")
				return
			}

		case <-ticker.C:
			// Regular ping framework to keep connections alive
			pingPayload, _ := json.Marshal(map[string]interface{}{
				"type": "ping",
			})
			writeCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
			err := c.conn.Write(writeCtx, websocket.MessageText, pingPayload)
			cancel()

			if err != nil {
				log.Debug().Err(err).Str("clientId", c.ID).Msg("Heartbeat ping failed")
				return
			}
		}
	}
}
