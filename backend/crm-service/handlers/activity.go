package handlers

import (
	"net/http"
	"strconv"

	"github.com/bizsaathi/crm-service/models"
	"github.com/bizsaathi/crm-service/services"
	"github.com/bizsaathi/crm-service/utils"
	"github.com/go-chi/chi/v5"
)

type ActivityHandler struct {
	svc *services.ActivityService
}

func NewActivityHandler(svc *services.ActivityService) *ActivityHandler {
	return &ActivityHandler{svc: svc}
}

func (h *ActivityHandler) ListByLead(w http.ResponseWriter, r *http.Request) {
	leadID := chi.URLParam(r, "leadId")
	activities, err := h.svc.ListByLead(r.Context(), leadID)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, activities, "")
}

func (h *ActivityHandler) CreateActivity(w http.ResponseWriter, r *http.Request) {
	leadID := chi.URLParam(r, "leadId")
	var input models.CreateActivityInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", utils.FormatValidationErrors(err))
		return
	}

	activity, err := h.svc.Create(r.Context(), leadID, input)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusCreated, activity, "Activity logged successfully")
}

func (h *ActivityHandler) Today(w http.ResponseWriter, r *http.Request) {
	activities, err := h.svc.Today(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, activities, "")
}

func (h *ActivityHandler) Upcoming(w http.ResponseWriter, r *http.Request) {
	daysStr := r.URL.Query().Get("days")
	days := 7
	if daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			days = d
		}
	}

	activities, err := h.svc.Upcoming(r.Context(), days)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, activities, "")
}

func (h *ActivityHandler) CreateFollowup(w http.ResponseWriter, r *http.Request) {
	leadID := chi.URLParam(r, "leadId")
	var input models.CreateFollowupInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, http.StatusBadRequest, "VALIDATION_ERROR", utils.FormatValidationErrors(err))
		return
	}

	followup, err := h.svc.CreateFollowup(r.Context(), leadID, input)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusCreated, followup, "Followup scheduled successfully")
}

func (h *ActivityHandler) OverdueFollowups(w http.ResponseWriter, r *http.Request) {
	followups, err := h.svc.OverdueFollowups(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, followups, "")
}

func (h *ActivityHandler) MarkFollowupDone(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.MarkFollowupDone(r.Context(), id); err != nil {
		utils.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	utils.JSON(w, http.StatusOK, nil, "Followup marked as completed")
}
