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

type LeadService struct {
	leadRepo     *repository.LeadRepo
	activityRepo *repository.ActivityRepo
	pipelineRepo *repository.PipelineRepo
	redis        *redis.Client
}

func NewLeadService(lr *repository.LeadRepo, ar *repository.ActivityRepo, pr *repository.PipelineRepo, rdb *redis.Client) *LeadService {
	return &LeadService{leadRepo: lr, activityRepo: ar, pipelineRepo: pr, redis: rdb}
}

func (s *LeadService) Create(ctx context.Context, input models.CreateLeadInput) (*models.Lead, error) {
	tenantID := middleware.GetTenantID(ctx)
	userID := middleware.GetUserID(ctx)
	var expectedClose *time.Time
	if input.ExpectedCloseDate != "" {
		t, err := time.Parse("2006-01-02", input.ExpectedCloseDate)
		if err == nil { expectedClose = &t }
	}
	l := &models.Lead{
		TenantID: tenantID, ContactID: input.ContactID, PipelineID: input.PipelineID,
		StageID: input.StageID, Title: input.Title, Description: input.Description,
		Value: input.Value, Currency: "INR", Probability: input.Probability,
		Status: "OPEN", Priority: input.Priority, ExpectedCloseDate: expectedClose,
		AssignedTo: input.AssignedTo, CreatedBy: userID,
	}
	if l.Priority == "" { l.Priority = "MEDIUM" }
	if err := s.leadRepo.Create(ctx, l); err != nil { return nil, err }

	// Auto-create activity
	act := &models.Activity{TenantID: tenantID, LeadID: l.ID, ContactID: l.ContactID,
		Type: "NOTE", Title: "Lead created", CreatedBy: userID}
	s.activityRepo.Create(ctx, act)
	s.invalidateCache(ctx, tenantID)
	return l, nil
}

func (s *LeadService) List(ctx context.Context, f models.LeadFilter) ([]models.Lead, int64, error) {
	tenantID := middleware.GetTenantID(ctx)
	cacheKey := fmt.Sprintf("crm:leads:%s:%d:%s:%s", tenantID, f.Page, f.Status, f.Search)
	if cached, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		var result struct{ Items []models.Lead; Total int64 }
		if json.Unmarshal([]byte(cached), &result) == nil { return result.Items, result.Total, nil }
	}
	items, total, err := s.leadRepo.FindAll(ctx, tenantID, f)
	if err != nil { return nil, 0, err }
	data, _ := json.Marshal(map[string]interface{}{"Items": items, "Total": total})
	s.redis.Set(ctx, cacheKey, data, 2*time.Minute)
	return items, total, nil
}

func (s *LeadService) GetByID(ctx context.Context, id string) (*models.Lead, error) {
	return s.leadRepo.FindByID(ctx, id, middleware.GetTenantID(ctx))
}

func (s *LeadService) GetKanban(ctx context.Context, pipelineID string) ([]models.LeadKanbanStage, error) {
	tenantID := middleware.GetTenantID(ctx)
	if pipelineID == "" {
		pipelines, _ := s.pipelineRepo.FindAll(ctx, tenantID)
		if len(pipelines) > 0 { pipelineID = pipelines[0].ID }
	}
	pipeline, err := s.pipelineRepo.FindByID(ctx, pipelineID, tenantID)
	if err != nil { return nil, err }
	grouped, err := s.leadRepo.FindKanbanGrouped(ctx, tenantID, pipelineID)
	if err != nil { return nil, err }

	var stages []models.LeadKanbanStage
	for _, stage := range pipeline.Stages {
		leads := grouped[stage.ID]
		if leads == nil { leads = []models.KanbanLead{} }
		totalVal := 0.0
		for _, l := range leads { totalVal += l.Value }
		stages = append(stages, models.LeadKanbanStage{
			StageID: stage.ID, StageName: stage.Name, Color: stage.Color,
			TotalValue: totalVal, Leads: leads,
		})
	}
	return stages, nil
}

func (s *LeadService) Update(ctx context.Context, id string, input models.UpdateLeadInput) error {
	tenantID := middleware.GetTenantID(ctx)
	if err := s.leadRepo.Update(ctx, id, tenantID, input); err != nil { return err }
	s.invalidateCache(ctx, tenantID)
	return nil
}

func (s *LeadService) MoveStage(ctx context.Context, id string, input models.MoveStageInput) error {
	tenantID := middleware.GetTenantID(ctx)
	userID := middleware.GetUserID(ctx)
	if err := s.leadRepo.UpdateStage(ctx, id, tenantID, input.StageID); err != nil { return err }

	title := "Moved to stage " + input.StageID
	if input.Note != "" { title = input.Note }
	act := &models.Activity{TenantID: tenantID, LeadID: id, Type: "NOTE", Title: title, CreatedBy: userID}
	s.activityRepo.Create(ctx, act)
	s.invalidateCache(ctx, tenantID)
	return nil
}

func (s *LeadService) MarkWon(ctx context.Context, id string, input models.WonInput) error {
	tenantID := middleware.GetTenantID(ctx)
	userID := middleware.GetUserID(ctx)
	closeDate := time.Now()
	if input.ActualCloseDate != "" {
		if t, err := time.Parse("2006-01-02", input.ActualCloseDate); err == nil { closeDate = t }
	}
	if err := s.leadRepo.MarkWon(ctx, id, tenantID, closeDate); err != nil { return err }
	note := "Deal won!"
	if input.Note != "" { note = input.Note }
	act := &models.Activity{TenantID: tenantID, LeadID: id, Type: "NOTE", Title: note, CreatedBy: userID, IsDone: true}
	s.activityRepo.Create(ctx, act)
	s.invalidateCache(ctx, tenantID)
	return nil
}

func (s *LeadService) MarkLost(ctx context.Context, id string, input models.LostInput) error {
	tenantID := middleware.GetTenantID(ctx)
	userID := middleware.GetUserID(ctx)
	if err := s.leadRepo.MarkLost(ctx, id, tenantID, input.LostReason); err != nil { return err }
	note := "Deal lost: " + input.LostReason
	if input.Note != "" { note = input.Note }
	act := &models.Activity{TenantID: tenantID, LeadID: id, Type: "NOTE", Title: note, CreatedBy: userID}
	s.activityRepo.Create(ctx, act)
	s.invalidateCache(ctx, tenantID)
	return nil
}

func (s *LeadService) invalidateCache(ctx context.Context, tenantID string) {
	keys, _ := s.redis.Keys(ctx, fmt.Sprintf("crm:leads:%s:*", tenantID)).Result()
	if len(keys) > 0 { s.redis.Del(ctx, keys...) }
}
