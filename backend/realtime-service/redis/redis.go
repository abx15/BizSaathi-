package redis

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

type RedisClient struct {
	Client *redis.Client
}

func NewRedisClient(url string) (*RedisClient, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}

	client := redis.NewClient(opts)

	// Test connection with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		client.Close()
		return nil, err
	}

	log.Info().Msg("Connected to Redis server successfully")
	return &RedisClient{Client: client}, nil
}

func (r *RedisClient) Close() {
	if err := r.Client.Close(); err != nil {
		log.Error().Err(err).Msg("Error closing Redis client")
	}
}
