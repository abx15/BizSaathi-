package services

import (
	"context"
	"time"

	"github.com/bizsaathi/crm-service/middleware"
	"github.com/bizsaathi/crm-service/models"
	"github.com/bizsaathi/crm-service/repository"
)

type ActivityService struct {
	repo *repository.ActivityRepo
}

func NewActivityService(repo *repository.ActivityRepo) *ActivityService {
	return &ActivityService{repo: repo}
}

func (s *ActivityService) Create(ctx context.Context, leadID string, input models.CreateActivityInput) (*models.Activity, error) {
	tenantID := middleware.GetTenantID(ctx)
	userID := middleware.GetUserID(ctx)

	a := &models.Activity{
		TenantID: tenantID, LeadID: leadID, Type: input.Type,
		Title: input.Title, Description: input.Description,
		Outcome: input.Outcome, IsDone: input.IsDone, CreatedBy: userID,
	}
	if input.ScheduledAt != "" {
		t, _ := time.Parse(time.RFC3339, input.ScheduledAt)
		a.ScheduledAt = &t
	}
	if input.CompletedAt != "" {
		t, _ := time.Parse(time.RFC3339, input.CompletedAt)
		a.CompletedAt = &t
	}
	if err := s.repo.Create(ctx, a); err != nil { return nil, err }
	return a, nil
}

func (s *ActivityService) ListByLead(ctx context.Context, leadID string) ([]models.Activity, error) {
	return s.repo.FindByLead(ctx, middleware.GetTenantID(ctx), leadID)
}

func (s *ActivityService) Today(ctx context.Context) ([]models.Activity, error) {
	return s.repo.FindToday(ctx, middleware.GetTenantID(ctx))
}

func (s *ActivityService) Upcoming(ctx context.Context, days int) ([]models.Activity, error) {
	if days <= 0 { days = 7 }
	return s.repo.FindUpcoming(ctx, middleware.GetTenantID(ctx), days)
}

func (s *ActivityService) CreateFollowup(ctx context.Context, leadID string, input models.CreateFollowupInput) (*models.Followup, error) {
	tenantID := middleware.GetTenantID(ctx)
	userID := middleware.GetUserID(ctx)
	dueAt, _ := time.Parse(time.RFC3339, input.DueAt)
	f := &models.Followup{
		TenantID: tenantID, LeadID: leadID, Title: input.Title,
		Note: input.Note, DueAt: dueAt, CreatedBy: userID,
	}
	if err := s.repo.CreateFollowup(ctx, f); err != nil { return nil, err }
	return f, nil
}

func (s *ActivityService) OverdueFollowups(ctx context.Context) ([]models.Followup, error) {
	return s.repo.FindOverdueFollowups(ctx, middleware.GetTenantID(ctx))
}

func (s *ActivityService) MarkFollowupDone(ctx context.Context, id string) error {
	return s.repo.MarkFollowupDone(ctx, id, middleware.GetTenantID(ctx))
}
