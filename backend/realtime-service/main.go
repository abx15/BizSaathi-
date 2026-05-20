package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bizsaathi/realtime-service/auth"
	"github.com/bizsaathi/realtime-service/config"
	"github.com/bizsaathi/realtime-service/events"
	"github.com/bizsaathi/realtime-service/handlers"
	"github.com/bizsaathi/realtime-service/hub"
	"github.com/bizsaathi/realtime-service/middleware"
	"github.com/bizsaathi/realtime-service/redis"
	"github.com/bizsaathi/realtime-service/utils"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/rs/zerolog/log"
)

func main() {
	// 1. Load Configurations
	cfg := config.LoadConfig()

	// 2. Initialise Logger
	utils.InitLogger(cfg.LOG_LEVEL)
	log.Info().Msg("Starting BizSaathi WebSocket Realtime Service...")

	// 3. Setup core lifecycle context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 4. Connect to Redis Pub/Sub
	redisClient, err := redis.NewRedisClient(cfg.REDIS_URL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer redisClient.Close()

	// 5. Initialise JWT Verifier
	jwtVerifier := auth.NewJWTVerifier(cfg.JWT_ACCESS_SECRET)

	// 6. Boot Central Hub connection manager
	myHub := hub.NewHub()
	go myHub.Run(ctx)

	// 7. Boot Redis pubsub listener
	subscriber := redis.NewSubscriber(redisClient.Client, myHub)
	go subscriber.Start(ctx)

	// 8. Boot internal event publisher HTTP API
	eventPublisher := events.NewPublisher(redisClient.Client, cfg.INTERNAL_API_KEY)

	// 9. Boot health and metrics handlers
	healthHandler := handlers.NewHealthHandler(myHub)

	// 10. Boot WS upgrader handler
	wsHandler := handlers.NewWSHandler(myHub, jwtVerifier, cfg.CORS_ORIGINS)

	// 11. Initialise Chi HTTP Router
	r := chi.NewRouter()

	// Attach logger middleware
	r.Use(middleware.Logger)

	// Configure CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORS_ORIGINS,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Internal-Key"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Register Routes
	r.Get("/health", healthHandler.HealthHandler())
	r.Get("/metrics", healthHandler.MetricsHandler())
	r.Get("/v1/ws", wsHandler.ServeHTTP)
	r.Post("/internal/publish", eventPublisher.PublishHandler())
	r.Post("/internal/publish/bulk", eventPublisher.BulkPublishHandler())

	// 12. Create and start HTTP Server
	serverAddr := fmt.Sprintf(":%d", cfg.PORT)
	server := &http.Server{
		Addr:    serverAddr,
		Handler: r,
	}

	go func() {
		log.Info().Msgf("WebSocket Realtime HTTP Server listening on %s", serverAddr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("HTTP server execution failure")
		}
	}()

	// 13. Wait for Interrupt Signals for Graceful Shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	sig := <-sigChan
	log.Info().Str("signal", sig.String()).Msg("Shutdown signal received, starting graceful teardown...")

	// Cancel lifecycle context to stop Redis Subscriber and Hub registration tasks
	cancel()

	// Send "system.shutdown" broadcast frame to all connected clients
	log.Info().Msg("Broadcasting system shutdown notice to active WebSocket clients...")
	shutdownPayload := &events.Event{
		ID:        "shutdown-event",
		Type:      events.EventType("system.shutdown"),
		Timestamp: time.Now(),
		Payload:   json.RawMessage(`{"message":"Server is restarting, reconnecting soon...","reconnectAfter":5}`),
	}
	myHub.BroadcastToAll(shutdownPayload)

	// Wait briefly to allow frames to flush out to connections
	time.Sleep(1 * time.Second)

	// Shutdown the HTTP server gracefully with a timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("Error during graceful HTTP server shutdown")
	} else {
		log.Info().Msg("HTTP Server closed successfully")
	}

	log.Info().Msg("Teardown completed. WebSocket Realtime Service offline.")
}
