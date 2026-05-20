package events

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

type Publisher struct {
	rdb             *redis.Client
	internalAPIKey  string
}

func NewPublisher(rdb *redis.Client, internalAPIKey string) *Publisher {
	return &Publisher{
		rdb:            rdb,
		internalAPIKey: internalAPIKey,
	}
}

type PublishResponse struct {
	Published bool   `json:"published"`
	Message   string `json:"message,omitempty"`
	Count     int    `json:"count,omitempty"`
}

// PublishHandler handles POST /internal/publish
func (p *Publisher) PublishHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Verify X-Internal-Key header
		key := r.Header.Get("X-Internal-Key")
		if key == "" || key != p.internalAPIKey {
			log.Warn().Str("ip", r.RemoteAddr).Msg("Unauthorized internal publish attempt (missing or invalid key)")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
			return
		}

		var event Event
		if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
			log.Error().Err(err).Msg("Failed to decode publish event payload")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid payload"})
			return
		}

		// Ensure envelope has necessary fields
		if event.ID == "" {
			event.ID = uuid.New().String()
		}
		if event.Timestamp.IsZero() {
			event.Timestamp = time.Now()
		}
		if event.Type == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "missing event type"})
			return
		}
		if event.TenantID == "" && event.UserID == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "missing both tenantId and userId"})
			return
		}

		// Serialize event envelope to push to Redis channel
		payloadBytes, err := json.Marshal(event)
		if err != nil {
			log.Error().Err(err).Msg("Failed to marshal event envelope")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "internal serialization error"})
			return
		}

		// Redis channel routing
		var channel string
		if event.UserID != "" {
			channel = "user:" + event.UserID
		} else {
			channel = "tenant:" + event.TenantID
		}

		// Publish to Redis
		ctx := r.Context()
		if err := p.rdb.Publish(ctx, channel, payloadBytes).Err(); err != nil {
			log.Error().Err(err).Str("channel", channel).Msg("Failed to publish event to Redis")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "redis publish failure"})
			return
		}

		log.Info().
			Str("eventId", event.ID).
			Str("eventType", string(event.Type)).
			Str("channel", channel).
			Msg("Event published successfully to Redis channel")

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(PublishResponse{Published: true})
	}
}

// BulkPublishHandler handles POST /internal/publish/bulk
func (p *Publisher) BulkPublishHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Verify X-Internal-Key header
		key := r.Header.Get("X-Internal-Key")
		if key == "" || key != p.internalAPIKey {
			log.Warn().Str("ip", r.RemoteAddr).Msg("Unauthorized internal bulk publish attempt (missing or invalid key)")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
			return
		}

		var req struct {
			Events []Event `json:"events"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Error().Err(err).Msg("Failed to decode bulk publish payload")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid payload"})
			return
		}

		if len(req.Events) == 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "empty events list"})
			return
		}

		ctx := r.Context()
		pipe := p.rdb.Pipeline()

		for i := range req.Events {
			event := &req.Events[i]
			if event.ID == "" {
				event.ID = uuid.New().String()
			}
			if event.Timestamp.IsZero() {
				event.Timestamp = time.Now()
			}
			if event.Type == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"error": "missing event type in one or more events"})
				return
			}
			if event.TenantID == "" && event.UserID == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"error": "missing both tenantId and userId in one or more events"})
				return
			}

			payloadBytes, err := json.Marshal(event)
			if err != nil {
				log.Error().Err(err).Msg("Failed to marshal event envelope in bulk")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "internal serialization error"})
				return
			}

			var channel string
			if event.UserID != "" {
				channel = "user:" + event.UserID
			} else {
				channel = "tenant:" + event.TenantID
			}

			pipe.Publish(ctx, channel, payloadBytes)
		}

		// Execute bulk pipeline
		_, err := pipe.Exec(ctx)
		if err != nil {
			log.Error().Err(err).Msg("Failed to execute Redis pipeline for bulk publishing")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "redis pipeline execution failure"})
			return
		}

		log.Info().Int("count", len(req.Events)).Msg("Bulk events published successfully to Redis")

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(PublishResponse{Published: true, Count: len(req.Events)})
	}
}
