package handlers

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/bizsaathi/crm-service/middleware"
	"github.com/bizsaathi/crm-service/models"
	"github.com/bizsaathi/crm-service/repository"
	"github.com/bizsaathi/crm-service/utils"
	"github.com/google/uuid"
)

type PipelineHandler struct {
	repo *repository.PipelineRepo
}

func NewPipelineHandler(repo *repository.PipelineRepo) *PipelineHandler {
	return &PipelineHandler{repo: repo}
}

func (h *PipelineHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())
	pipelines, err := h.repo.FindAll(r.Context(), tenantID)
	if err != nil { utils.Error(w, 500, "INTERNAL", err.Error()); return }
	if len(pipelines) == 0 {
		h.seedDefault(r.Context(), tenantID)
		pipelines, _ = h.repo.FindAll(r.Context(), tenantID)
	}
	utils.JSON(w, 200, pipelines, "")
}

func (h *PipelineHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.CreatePipelineInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, 400, "VALIDATION", utils.FormatValidationErrors(err)); return
	}
	p := &models.Pipeline{TenantID: middleware.GetTenantID(r.Context()), Name: input.Name, Description: input.Description, Stages: input.Stages}
	if err := h.repo.Create(r.Context(), p); err != nil { utils.Error(w, 500, "INTERNAL", err.Error()); return }
	utils.JSON(w, 201, p, "Pipeline created")
}

func (h *PipelineHandler) UpdateStages(w http.ResponseWriter, r *http.Request) {
	var input models.UpdateStagesInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, 400, "VALIDATION", utils.FormatValidationErrors(err)); return
	}
	tenantID := middleware.GetTenantID(r.Context())
	id := chi.URLParam(r, "id")
	if err := h.repo.UpdateStages(r.Context(), id, tenantID, input.Stages); err != nil {
		utils.Error(w, 500, "INTERNAL", err.Error()); return
	}
	utils.JSON(w, 200, nil, "Stages updated")
}

func (h *PipelineHandler) seedDefault(ctx context.Context, tenantID string) {
	p := &models.Pipeline{
		TenantID: tenantID, Name: "Sales Pipeline", IsDefault: true,
		Stages: []models.Stage{
			{ID: uuid.NewString(), Name: "New Lead", Order: 1, Color: "#94A3B8"},
			{ID: uuid.NewString(), Name: "Contacted", Order: 2, Color: "#60A5FA"},
			{ID: uuid.NewString(), Name: "Interested", Order: 3, Color: "#FBBF24"},
			{ID: uuid.NewString(), Name: "Negotiation", Order: 4, Color: "#F97316"},
			{ID: uuid.NewString(), Name: "Won", Order: 5, Color: "#22C55E"},
			{ID: uuid.NewString(), Name: "Lost", Order: 6, Color: "#EF4444"},
		},
	}
	h.repo.Create(ctx, p)
}
