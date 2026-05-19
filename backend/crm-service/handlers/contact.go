package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/bizsaathi/crm-service/models"
	"github.com/bizsaathi/crm-service/services"
	"github.com/bizsaathi/crm-service/utils"
)

type ContactHandler struct {
	svc *services.ContactService
}

func NewContactHandler(svc *services.ContactService) *ContactHandler {
	return &ContactHandler{svc: svc}
}

func (h *ContactHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	p := utils.ParsePagination(r)
	f := models.ContactFilter{Search: q.Get("search"), City: q.Get("city"), Source: q.Get("source"), Tags: q.Get("tags"), Page: p.Page, Limit: p.Limit, Offset: p.Offset}
	items, total, err := h.svc.List(r.Context(), f)
	if err != nil { utils.Error(w, 500, "INTERNAL", err.Error()); return }
	utils.Paginated(w, items, total, p.Page, p.Limit)
}

func (h *ContactHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.CreateContactInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, 400, "VALIDATION", utils.FormatValidationErrors(err)); return
	}
	c, err := h.svc.Create(r.Context(), input)
	if err != nil { utils.Error(w, 400, "BAD_REQUEST", err.Error()); return }
	utils.JSON(w, 201, c, "Contact created")
}

func (h *ContactHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	c, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil { utils.Error(w, 404, "NOT_FOUND", "Contact not found"); return }
	utils.JSON(w, 200, c, "")
}

func (h *ContactHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input models.UpdateContactInput
	if err := utils.DecodeAndValidate(r, &input); err != nil {
		utils.Error(w, 400, "VALIDATION", utils.FormatValidationErrors(err)); return
	}
	if err := h.svc.Update(r.Context(), chi.URLParam(r, "id"), input); err != nil {
		utils.Error(w, 400, "BAD_REQUEST", err.Error()); return
	}
	utils.JSON(w, 200, nil, "Contact updated")
}

func (h *ContactHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Delete(r.Context(), chi.URLParam(r, "id")); err != nil {
		utils.Error(w, 400, "BAD_REQUEST", err.Error()); return
	}
	utils.JSON(w, 200, nil, "Contact deleted")
}
