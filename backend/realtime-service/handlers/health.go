package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"sync/atomic"
	"time"

	"github.com/bizsaathi/realtime-service/hub"
	"github.com/bizsaathi/realtime-service/metrics"
)

var (
	StartTime = time.Now()
)

type HealthHandler struct {
	hub *hub.Hub
}

func NewHealthHandler(h *hub.Hub) *HealthHandler {
	return &HealthHandler{hub: h}
}

type HealthResponse struct {
	Status      string  `json:"status"`
	Connections int64   `json:"connections"`
	Rooms       int     `json:"rooms"`
	Uptime      float64 `json:"uptime"` // in seconds
}

func (h *HealthHandler) HealthHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stats := h.hub.GetStats()
		activeConns := h.hub.GetActiveConnectionsCount()

		res := HealthResponse{
			Status:      "ok",
			Connections: activeConns,
			Rooms:       stats.TotalRooms,
			Uptime:      time.Since(StartTime).Seconds(),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(res)
	}
}

func (h *HealthHandler) MetricsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stats := h.hub.GetStats()
		activeConns := h.hub.GetActiveConnectionsCount()

		// Get memory stats
		var m runtime.MemStats
		runtime.ReadMemStats(&m)

		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		w.WriteHeader(http.StatusOK)

		fmt.Fprintf(w, "# HELP realtime_connections_total Current active WebSocket connections\n")
		fmt.Fprintf(w, "# TYPE realtime_connections_total gauge\n")
		fmt.Fprintf(w, "realtime_connections_total %d\n\n", activeConns)

		fmt.Fprintf(w, "# HELP realtime_rooms_total Current active tenant rooms\n")
		fmt.Fprintf(w, "# TYPE realtime_rooms_total gauge\n")
		fmt.Fprintf(w, "realtime_rooms_total %d\n\n", stats.TotalRooms)

		fmt.Fprintf(w, "# HELP realtime_events_received_total Cumulative count of events received from Redis or internal HTTP\n")
		fmt.Fprintf(w, "# TYPE realtime_events_received_total counter\n")
		fmt.Fprintf(w, "realtime_events_received_total %d\n\n", atomic.LoadInt64(&metrics.EventsReceivedTotal))

		fmt.Fprintf(w, "# HELP realtime_events_dispatched_total Cumulative count of events dispatched to client send buffers\n")
		fmt.Fprintf(w, "# TYPE realtime_events_dispatched_total counter\n")
		fmt.Fprintf(w, "realtime_events_dispatched_total %d\n\n", atomic.LoadInt64(&metrics.EventsDispatchedTotal))

		fmt.Fprintf(w, "# HELP realtime_message_send_errors_total Cumulative count of failed sends or dropped frames\n")
		fmt.Fprintf(w, "# TYPE realtime_message_send_errors_total counter\n")
		fmt.Fprintf(w, "realtime_message_send_errors_total %d\n\n", atomic.LoadInt64(&metrics.MessageSendErrorsTotal))

		// Process memory statistics
		fmt.Fprintf(w, "# HELP realtime_memory_alloc_bytes Bytes allocated and still in use\n")
		fmt.Fprintf(w, "# TYPE realtime_memory_alloc_bytes gauge\n")
		fmt.Fprintf(w, "realtime_memory_alloc_bytes %d\n\n", m.Alloc)

		fmt.Fprintf(w, "# HELP realtime_goroutines_total Total number of active goroutines\n")
		fmt.Fprintf(w, "# TYPE realtime_goroutines_total gauge\n")
		fmt.Fprintf(w, "realtime_goroutines_total %d\n\n", runtime.NumGoroutine())
	}
}
