package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bizsaathi/crm-service/config"
	"github.com/bizsaathi/crm-service/db"
	"github.com/bizsaathi/crm-service/handlers"
	"github.com/bizsaathi/crm-service/middleware"
	"github.com/bizsaathi/crm-service/redis"
	"github.com/bizsaathi/crm-service/repository"
	"github.com/bizsaathi/crm-service/services"
	"github.com/bizsaathi/crm-service/utils"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	// 1. Load config
	cfg := config.Load()

	// 2. Init zerolog
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	level, err := zerolog.ParseLevel(cfg.LogLevel)
	if err != nil {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})

	log.Info().Msg("Starting BizSaathi CRM Service...")

	// 3. Connect PostgreSQL
	dbPool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Database connection failed")
	}
	defer dbPool.Close()

	// 4. Run database migrations
	m, err := migrate.New("file://db/migrations", cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize migrations")
	}
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatal().Err(err).Msg("Database migration failed")
	}
	log.Info().Msg("Database migrations applied successfully")

	// 5. Connect Redis
	redisClient, err := redis.Connect(cfg.RedisURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Redis connection failed")
	}
	defer redisClient.Close()

	// 6. Initialize Repositories, Services, and Handlers
	contactRepo := repository.NewContactRepo(dbPool)
	pipelineRepo := repository.NewPipelineRepo(dbPool)
	leadRepo := repository.NewLeadRepo(dbPool)
	activityRepo := repository.NewActivityRepo(dbPool)

	contactSvc := services.NewContactService(contactRepo, redisClient)
	leadSvc := services.NewLeadService(leadRepo, activityRepo, pipelineRepo, redisClient)
	activitySvc := services.NewActivityService(activityRepo)
	analyticsSvc := services.NewAnalyticsService(leadRepo, redisClient)

	contactHandler := handlers.NewContactHandler(contactSvc)
	pipelineHandler := handlers.NewPipelineHandler(pipelineRepo)
	leadHandler := handlers.NewLeadHandler(leadSvc)
	activityHandler := handlers.NewActivityHandler(activitySvc)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsSvc)

	// 7. Init Chi Router
	r := chi.NewRouter()

	// 8. Global Middleware
	r.Use(middleware.Recovery)
	r.Use(chiMiddleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Tenant-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(httprate.Limit(
		cfg.RateLimitRPM,
		1*time.Minute,
		httprate.WithKeyFuncs(httprate.KeyByIP, func(r *http.Request) (string, error) {
			return r.Header.Get("Authorization"), nil
		}),
	))

	// Health Check Routes (Public)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		utils.JSON(w, http.StatusOK, map[string]string{"status": "healthy"}, "CRM Service is up and running")
	})
	r.Get("/v1/health", func(w http.ResponseWriter, r *http.Request) {
		utils.JSON(w, http.StatusOK, map[string]string{"status": "healthy"}, "CRM Service is up and running")
	})

	// 9. API Routes (Protected)
	r.Route("/v1", func(r chi.Router) {
		r.Use(middleware.JWTAuth(cfg.JWTAccessSecret))
		r.Use(middleware.TenantRequired)

		// Contacts
		r.Route("/contacts", func(r chi.Router) {
			r.Get("/", contactHandler.List)
			r.Post("/", contactHandler.Create)
			r.Get("/{id}", contactHandler.GetByID)
			r.Put("/{id}", contactHandler.Update)
			r.Delete("/{id}", contactHandler.Delete)
		})

		// Pipelines
		r.Route("/pipelines", func(r chi.Router) {
			r.Get("/", pipelineHandler.List)
			r.Post("/", pipelineHandler.Create)
			r.Put("/{id}/stages", pipelineHandler.UpdateStages)
		})

		// Leads
		r.Route("/leads", func(r chi.Router) {
			r.Get("/", leadHandler.List)
			r.Get("/kanban", leadHandler.GetKanban)
			r.Post("/", leadHandler.Create)
			r.Get("/{id}", leadHandler.GetByID)
			r.Put("/{id}", leadHandler.Update)
			r.Put("/{id}/stage", leadHandler.MoveStage)
			r.Post("/{id}/won", leadHandler.MarkWon)
			r.Post("/{id}/lost", leadHandler.MarkLost)

			// Nested activities and followups
			r.Get("/{leadId}/activities", activityHandler.ListByLead)
			r.Post("/{leadId}/activities", activityHandler.CreateActivity)
			r.Post("/{leadId}/followups", activityHandler.CreateFollowup)
		})

		// Independent activities/followups
		r.Get("/activities/today", activityHandler.Today)
		r.Get("/activities/upcoming", activityHandler.Upcoming)
		r.Get("/followups/overdue", activityHandler.OverdueFollowups)
		r.Put("/followups/{id}/done", activityHandler.MarkFollowupDone)

		// Analytics
		r.Route("/crm", func(r chi.Router) {
			r.Get("/analytics", analyticsHandler.GetAnalytics)
		})
	})

	// 10. Start Server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  30 * time.Second,
	}

	go func() {
		log.Info().Msgf("Server listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("Server failed to start")
		}
	}()

	// 11. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	} else {
		log.Info().Msg("Server stopped gracefully")
	}
}
