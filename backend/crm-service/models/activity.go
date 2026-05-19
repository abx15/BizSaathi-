package models

import "time"

type Activity struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenantId"`
	LeadID      string     `json:"leadId,omitempty"`
	ContactID   string     `json:"contactId,omitempty"`
	Type        string     `json:"type"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Outcome     string     `json:"outcome,omitempty"`
	ScheduledAt *time.Time `json:"scheduledAt,omitempty"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
	IsDone      bool       `json:"isDone"`
	CreatedBy   string     `json:"createdBy,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`

	// Joined
	LeadTitle   string `json:"leadTitle,omitempty"`
	ContactName string `json:"contactName,omitempty"`
}

type CreateActivityInput struct {
	Type        string `json:"type" validate:"required,oneof=CALL EMAIL MEETING NOTE WHATSAPP TASK"`
	Title       string `json:"title" validate:"required,max=300"`
	Description string `json:"description"`
	Outcome     string `json:"outcome"`
	ScheduledAt string `json:"scheduledAt"`
	CompletedAt string `json:"completedAt"`
	IsDone      bool   `json:"isDone"`
}

type Followup struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenantId"`
	LeadID      string     `json:"leadId,omitempty"`
	ContactID   string     `json:"contactId,omitempty"`
	Title       string     `json:"title"`
	Note        string     `json:"note,omitempty"`
	DueAt       time.Time  `json:"dueAt"`
	IsDone      bool       `json:"isDone"`
	DoneAt      *time.Time `json:"doneAt,omitempty"`
	CreatedBy   string     `json:"createdBy,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`

	// Joined
	LeadTitle   string `json:"leadTitle,omitempty"`
	ContactName string `json:"contactName,omitempty"`
}

type CreateFollowupInput struct {
	Title string `json:"title" validate:"required,max=300"`
	Note  string `json:"note"`
	DueAt string `json:"dueAt" validate:"required"`
}
