package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	DatabaseURL     string
	RedisURL        string
	JWTAccessSecret string
	LogLevel        string
	RateLimitRPM    int
}

func Load() *Config {
	_ = godotenv.Load()

	rpm, _ := strconv.Atoi(getEnv("RATE_LIMIT_RPM", "120"))

	return &Config{
		Port:            getEnv("PORT", "3005"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/bizsaathi"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTAccessSecret: getEnv("JWT_ACCESS_SECRET", ""),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
		RateLimitRPM:    rpm,
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
