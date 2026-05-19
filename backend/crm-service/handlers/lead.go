package handlers

import (
	"net/http"

	"github.com/bizsaathi/crm-service/models"
	"github.com/bizsaathi/crm-service/services"
	"github.com/bizsaathi/crm-service/utils"
	"github.com/go-chi/chi/v5"
)

type LeadHandler struct {
	svc *services.LeadService
}

func NewLeadHandler(svc *services.LeadService) *LeadHandler {
	return &LeadHandler{svc: svc}
}

func (h *LeadHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	p := utils.ParsePagination(r)
	f := models.LeadFilter{
		Status:     q.Get("status"),
		StageID:    q.Get("stageId"),
		PipelineID: q.Get("pipelineId"),
		ContactID:  q.Get("contactId"),
		Priority:   q.Get("priority"),
		AssignedTo: q.Get("assignedTo"),
		From:       q.Get("from"),
		To:         q.Get("to"),
		Search:     q.Get("search"),
		Page:       p.Page,
		Limit:      p.Limit,
		Offset:     p.Offset,
	}

	leads, total, err := h.svc.List(r.Context(), f)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.Paginated(w, leads, total, p.Page, p.Limit)
}

func (h *LeadHandler) GetKanban(w http.ResponseWriter, r *http.Request) {
	pipelineID := r.URL.Query().Get("pipelineId")
	stages, err := h.svc.GetKanban(r.Context(), pipelineID)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, stages, "")
}

func (h *LeadHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.CreateLeadInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", utils.FormatValidationErrors(err))
		return
	}

	lead, err := h.svc.Create(r.Context(), input)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusCreated, lead, "Lead created successfully")
}

func (h *LeadHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	lead, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		utils.Error(w, http.StatusNotFound, "NOT_FOUND", "Lead not found")
		return
	}

	utils.JSON(w, http.StatusOK, lead, "")
}

func (h *LeadHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input models.UpdateLeadInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", utils.FormatValidationErrors(err))
		return
	}

	if err := h.svc.Update(r.Context(), id, input); err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, nil, "Lead updated successfully")
}

func (h *LeadHandler) MoveStage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input models.MoveStageInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", utils.FormatValidationErrors(err))
		return
	}

	if err := h.svc.MoveStage(r.Context(), id, input); err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, nil, "Lead stage moved successfully")
}

func (h *LeadHandler) MarkWon(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input models.WonInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", utils.FormatValidationErrors(err))
		return
	}

	if err := h.svc.MarkWon(r.Context(), id, input); err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, nil, "Lead marked as WON successfully")
}

func (h *LeadHandler) MarkLost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input models.LostInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", utils.FormatValidationErrors(err))
		return
	}

	if err := h.svc.MarkLost(r.Context(), id, input); err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, nil, "Lead marked as LOST successfully")
}
