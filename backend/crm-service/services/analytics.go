package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bizsaathi/crm-service/middleware"
	"github.com/bizsaathi/crm-service/models"
	"github.com/bizsaathi/crm-service/repository"
	"github.com/redis/go-redis/v9"
)

type AnalyticsService struct {
	leadRepo *repository.LeadRepo
	redis    *redis.Client
}

func NewAnalyticsService(lr *repository.LeadRepo, rdb *redis.Client) *AnalyticsService {
	return &AnalyticsService{leadRepo: lr, redis: rdb}
}

func (s *AnalyticsService) GetAnalytics(ctx context.Context, from, to string) (*models.CRMAnalytics, error) {
	tenantID := middleware.GetTenantID(ctx)
	cacheKey := fmt.Sprintf("crm:analytics:%s:%s:%s", tenantID, from, to)

	if cached, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		var result models.CRMAnalytics
		if json.Unmarshal([]byte(cached), &result) == nil {
			return &result, nil
		}
	}

	analytics, err := s.leadRepo.GetAnalytics(ctx, tenantID, from, to)
	if err != nil {
		return nil, err
	}

	data, _ := json.Marshal(analytics)
	s.redis.Set(ctx, cacheKey, data, 10*time.Minute)

	return analytics, nil
}
