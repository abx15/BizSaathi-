package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
)

type Config struct {
	PORT                 int
	REDIS_URL            string
	JWT_ACCESS_SECRET    string
	INTERNAL_API_KEY     string
	CORS_ORIGINS         []string
	MAX_CONNECTIONS      int
	PING_INTERVAL_SEC    int
	PONG_TIMEOUT_SEC     int
	LOG_LEVEL            string
}

func LoadConfig() *Config {
	// Optional load .env
	_ = godotenv.Load()

	port, err := strconv.Atoi(getEnv("PORT", "3006"))
	if err != nil {
		log.Warn().Msg("Invalid PORT, defaulting to 3006")
		port = 3006
	}

	maxConn, err := strconv.Atoi(getEnv("MAX_CONNECTIONS", "10000"))
	if err != nil {
		maxConn = 10000
	}

	pingInt, err := strconv.Atoi(getEnv("PING_INTERVAL_SECONDS", "30"))
	if err != nil {
		pingInt = 30
	}

	pongTimeout, err := strconv.Atoi(getEnv("PONG_TIMEOUT_SECONDS", "10"))
	if err != nil {
		pongTimeout = 10
	}

	corsOriginsStr := getEnv("CORS_ORIGINS", "http://localhost:3000,https://bizsaathi.in")
	corsOrigins := strings.Split(corsOriginsStr, ",")
	for i, origin := range corsOrigins {
		corsOrigins[i] = strings.TrimSpace(origin)
	}

	return &Config{
		PORT:              port,
		REDIS_URL:         getEnv("REDIS_URL", "redis://localhost:6379"),
		JWT_ACCESS_SECRET: getEnv("JWT_ACCESS_SECRET", "change_me_access_secret_min_32_chars"),
		INTERNAL_API_KEY:  getEnv("INTERNAL_API_KEY", "super_secret_internal_key"),
		CORS_ORIGINS:      corsOrigins,
		MAX_CONNECTIONS:   maxConn,
		PING_INTERVAL_SEC: pingInt,
		PONG_TIMEOUT_SEC:  pongTimeout,
		LOG_LEVEL:         getEnv("LOG_LEVEL", "info"),
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return defaultVal
}
