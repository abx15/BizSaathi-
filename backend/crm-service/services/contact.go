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

type ContactService struct {
	repo  *repository.ContactRepo
	redis *redis.Client
}

func NewContactService(repo *repository.ContactRepo, rdb *redis.Client) *ContactService {
	return &ContactService{repo: repo, redis: rdb}
}

func (s *ContactService) Create(ctx context.Context, input models.CreateContactInput) (*models.Contact, error) {
	tenantID := middleware.GetTenantID(ctx)
	if input.Phone != "" {
		exists, _ := s.repo.PhoneExists(ctx, tenantID, input.Phone, "")
		if exists {
			return nil, fmt.Errorf("contact with phone %s already exists", input.Phone)
		}
	}
	c := &models.Contact{
		TenantID: tenantID, Name: input.Name, Phone: input.Phone, Email: input.Email,
		Company: input.Company, GSTIN: input.GSTIN, Designation: input.Designation,
		Address: input.Address, City: input.City, State: input.State,
		Source: input.Source, Tags: input.Tags, Notes: input.Notes,
	}
	if c.Tags == nil { c.Tags = []string{} }
	if err := s.repo.Create(ctx, c); err != nil { return nil, err }
	s.invalidateCache(ctx, tenantID)
	return c, nil
}

func (s *ContactService) List(ctx context.Context, f models.ContactFilter) ([]models.Contact, int64, error) {
	tenantID := middleware.GetTenantID(ctx)
	cacheKey := fmt.Sprintf("crm:contacts:%s:%d:%s", tenantID, f.Page, f.Search)
	if cached, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		var result struct{ Items []models.Contact; Total int64 }
		if json.Unmarshal([]byte(cached), &result) == nil {
			return result.Items, result.Total, nil
		}
	}
	items, total, err := s.repo.FindAll(ctx, tenantID, f)
	if err != nil { return nil, 0, err }
	data, _ := json.Marshal(map[string]interface{}{"Items": items, "Total": total})
	s.redis.Set(ctx, cacheKey, data, 3*time.Minute)
	return items, total, nil
}

func (s *ContactService) GetByID(ctx context.Context, id string) (*models.Contact, error) {
	return s.repo.FindByID(ctx, id, middleware.GetTenantID(ctx))
}

func (s *ContactService) Update(ctx context.Context, id string, input models.UpdateContactInput) error {
	tenantID := middleware.GetTenantID(ctx)
	if err := s.repo.Update(ctx, id, tenantID, input); err != nil { return err }
	s.invalidateCache(ctx, tenantID)
	return nil
}

func (s *ContactService) Delete(ctx context.Context, id string) error {
	tenantID := middleware.GetTenantID(ctx)
	hasLeads, _ := s.repo.HasOpenLeads(ctx, id, tenantID)
	if hasLeads { return fmt.Errorf("cannot delete contact with open leads") }
	if err := s.repo.SoftDelete(ctx, id, tenantID); err != nil { return err }
	s.invalidateCache(ctx, tenantID)
	return nil
}

func (s *ContactService) invalidateCache(ctx context.Context, tenantID string) {
	keys, _ := s.redis.Keys(ctx, fmt.Sprintf("crm:contacts:%s:*", tenantID)).Result()
	if len(keys) > 0 { s.redis.Del(ctx, keys...) }
}
