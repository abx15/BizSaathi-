package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/bizsaathi/realtime-service/auth"
	"github.com/bizsaathi/realtime-service/hub"
	"github.com/coder/websocket"
	"github.com/rs/zerolog/log"
)

type WSHandler struct {
	hub         *hub.Hub
	jwtVerifier *auth.JWTVerifier
	corsOrigins []string
}

func NewWSHandler(h *hub.Hub, jv *auth.JWTVerifier, corsOrigins []string) *WSHandler {
	return &WSHandler{
		hub:         h,
		jwtVerifier: jv,
		corsOrigins: corsOrigins,
	}
}

func (h *WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 1. Extract JWT from query parameter "token" or Authorization header
	token := r.URL.Query().Get("token")
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = authHeader[7:]
		}
	}

	if token == "" {
		log.Warn().Msg("WebSocket upgrade failed: missing token")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized: missing token"})
		return
	}

	// 2. Verify JWT token
	claims, err := h.jwtVerifier.VerifyToken(token)
	if err != nil {
		log.Warn().Err(err).Msg("WebSocket upgrade failed: invalid token verification")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized: invalid token"})
		return
	}

	// 3. Configure WebSocket Upgrade Options
	acceptOpts := &websocket.AcceptOptions{
		CompressionMode: websocket.CompressionContextTakeover,
	}

	// Handle CORS origins checks
	if len(h.corsOrigins) > 0 {
		// If custom list, verify the origin or configure standard list
		acceptOpts.OriginPatterns = h.corsOrigins
	} else {
		// Default fallback allowing development environment upgrades
		acceptOpts.InsecureSkipVerify = true
	}

	// 4. Upgrade HTTP → WebSocket
	conn, err := websocket.Accept(w, r, acceptOpts)
	if err != nil {
		log.Error().Err(err).Msg("Failed to upgrade HTTP connection to WebSocket")
		return
	}

	// 5. Instantiation of single Client details
	client := hub.NewClient(conn, claims.Sub, claims.TenantID, claims.Role, h.hub)

	// 6. Connect pumps and register with Hub connection manager
	// Ensure we run using the request context or context background linked to server shutdown
	// In standard Go, request contexts are cancelled when connection closes, which serves as a great exit signal
	clientCtx := r.Context()
	client.Start(clientCtx)

	// 7. Push initial "system.connected" greeting frame
	connectedPayload, _ := json.Marshal(map[string]interface{}{
		"type": "system.connected",
		"payload": map[string]interface{}{
			"clientId":   client.ID,
			"userId":     client.UserID,
			"tenantId":   client.TenantID,
			"role":       client.Role,
			"serverTime": time.Now().Format(time.RFC3339),
		},
	})

	// Safely pass to the client send loop
	select {
	case client.GetSendChannel() <- connectedPayload:
	default:
		log.Warn().Str("clientId", client.ID).Msg("Failed to send initial connected frame (buffer full)")
	}

	log.Info().
		Str("clientId", client.ID).
		Str("userId", client.UserID).
		Str("tenantId", client.TenantID).
		Msg("WebSocket upgraded successfully")
}
