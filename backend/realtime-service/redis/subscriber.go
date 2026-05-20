package redis

import (
	"context"
	"encoding/json"
	"time"

	"github.com/bizsaathi/realtime-service/events"
	"github.com/bizsaathi/realtime-service/metrics"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type Subscriber struct {
	client *redis.Client
	hub    HubForSubscriber
	logger zerolog.Logger
}

// HubForSubscriber is an interface that matches the hub's capabilities needed by the subscriber
type HubForSubscriber interface {
	BroadcastToTenant(tenantID string, event *events.Event)
	BroadcastToUser(userID string, event *events.Event)
}

func NewSubscriber(client *redis.Client, h HubForSubscriber) *Subscriber {
	return &Subscriber{
		client: client,
		hub:    h,
		logger: log.With().Str("component", "redis_subscriber").Logger(),
	}
}

func (s *Subscriber) Start(ctx context.Context) {
	s.logger.Info().Msg("Starting Redis Pub/Sub subscription loop...")

	backoff := 1 * time.Second
	maxBackoff := 30 * time.Second

	for {
		select {
		case <-ctx.Done():
			s.logger.Info().Msg("Redis Subscriber shutting down...")
			return
		default:
			// Attempt to subscribe
			err := s.subscribeAndListen(ctx)
			if err != nil {
				s.logger.Error().Err(err).Msgf("Subscription loop interrupted, reconnecting in %v...", backoff)
				
				select {
				case <-ctx.Done():
					return
				case <-time.After(backoff):
					backoff *= 2
					if backoff > maxBackoff {
						backoff = maxBackoff
					}
				}
			} else {
				// Reset backoff on successful run
				backoff = 1 * time.Second
			}
		}
	}
}

func (s *Subscriber) subscribeAndListen(ctx context.Context) error {
	pubsub := s.client.PSubscribe(ctx, "tenant:*", "user:*", "system:alerts")
	defer pubsub.Close()

	// Verify subscription active
	_, err := pubsub.ReceiveTimeout(ctx, 5*time.Second)
	if err != nil {
		return err
	}

	s.logger.Info().Msg("Subscribed successfully to Redis channels: 'tenant:*', 'user:*', 'system:alerts'")

	ch := pubsub.Channel()

	for {
		select {
		case <-ctx.Done():
			return nil
		case msg, ok := <-ch:
			if !ok {
				s.logger.Warn().Msg("Redis Pub/Sub channel closed")
				return redis.ErrClosed
			}

			go s.processPubSubMessage(msg)
		}
	}
}

func (s *Subscriber) processPubSubMessage(msg *redis.Message) {
	var event events.Event
	if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
		s.logger.Warn().Err(err).Str("channel", msg.Channel).Msg("Malformed event received via Pub/Sub")
		return
	}

	metrics.IncrementEventsReceived()

	// Logging structured details
	s.logger.Info().
		Str("eventId", event.ID).
		Str("eventType", string(event.Type)).
		Str("tenantId", event.TenantID).
		Str("userId", event.UserID).
		Msg("Event received from Redis Pub/Sub")

	// Routing logic: check if target is user-specific or tenant broadcast
	if event.UserID != "" {
		s.hub.BroadcastToUser(event.UserID, &event)
	} else if event.TenantID != "" {
		s.hub.BroadcastToTenant(event.TenantID, &event)
	}
}
