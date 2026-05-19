package models

import "time"

type Lead struct {
	ID                string     `json:"id"`
	TenantID          string     `json:"tenantId"`
	ContactID         string     `json:"contactId,omitempty"`
	PipelineID        string     `json:"pipelineId,omitempty"`
	StageID           string     `json:"stageId"`
	Title             string     `json:"title"`
	Description       string     `json:"description,omitempty"`
	Value             float64    `json:"value"`
	Currency          string     `json:"currency"`
	Probability       int        `json:"probability"`
	Status            string     `json:"status"`
	Priority          string     `json:"priority"`
	ExpectedCloseDate *time.Time `json:"expectedCloseDate,omitempty"`
	ActualCloseDate   *time.Time `json:"actualCloseDate,omitempty"`
	LostReason        string     `json:"lostReason,omitempty"`
	AssignedTo        string     `json:"assignedTo,omitempty"`
	CreatedBy         string     `json:"createdBy,omitempty"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`

	// Joined fields
	ContactName string `json:"contactName,omitempty"`
}

type CreateLeadInput struct {
	ContactID         string  `json:"contactId" validate:"required"`
	PipelineID        string  `json:"pipelineId" validate:"required"`
	StageID           string  `json:"stageId" validate:"required"`
	Title             string  `json:"title" validate:"required,max=300"`
	Description       string  `json:"description"`
	Value             float64 `json:"value"`
	Probability       int     `json:"probability" validate:"min=0,max=100"`
	Priority          string  `json:"priority" validate:"oneof=LOW MEDIUM HIGH URGENT"`
	ExpectedCloseDate string  `json:"expectedCloseDate"`
	AssignedTo        string  `json:"assignedTo"`
}

type UpdateLeadInput struct {
	Title             *string  `json:"title"`
	Description       *string  `json:"description"`
	Value             *float64 `json:"value"`
	Probability       *int     `json:"probability"`
	Priority          *string  `json:"priority"`
	ExpectedCloseDate *string  `json:"expectedCloseDate"`
	AssignedTo        *string  `json:"assignedTo"`
}

type MoveStageInput struct {
	StageID string `json:"stageId" validate:"required"`
	Note    string `json:"note"`
}

type WonInput struct {
	ActualCloseDate string `json:"actualCloseDate"`
	Note            string `json:"note"`
}

type LostInput struct {
	LostReason string `json:"lostReason" validate:"required"`
	Note       string `json:"note"`
}

type LeadFilter struct {
	Status     string
	StageID    string
	PipelineID string
	ContactID  string
	Priority   string
	AssignedTo string
	From       string
	To         string
	Search     string
	Page       int
	Limit      int
	Offset     int
}

type LeadKanbanStage struct {
	StageID    string       `json:"stageId"`
	StageName  string       `json:"stageName"`
	Color      string       `json:"color"`
	TotalValue float64      `json:"totalValue"`
	Leads      []KanbanLead `json:"leads"`
}

type KanbanLead struct {
	ID            string     `json:"id"`
	Title         string     `json:"title"`
	ContactName   string     `json:"contactName"`
	Value         float64    `json:"value"`
	Priority      string     `json:"priority"`
	DaysInStage   int        `json:"daysInStage"`
	NextFollowup  *time.Time `json:"nextFollowup,omitempty"`
}

type CRMAnalytics struct {
	Summary          AnalyticsSummary    `json:"summary"`
	ByStage          []StageAnalytics    `json:"byStage"`
	BySource         []SourceAnalytics   `json:"bySource"`
	MonthlyTrend     []MonthlyTrend      `json:"monthlyTrend"`
	ConversionFunnel []FunnelStage       `json:"conversionFunnel"`
}

type AnalyticsSummary struct {
	TotalLeads         int     `json:"totalLeads"`
	OpenLeads          int     `json:"openLeads"`
	WonLeads           int     `json:"wonLeads"`
	LostLeads          int     `json:"lostLeads"`
	TotalPipelineValue float64 `json:"totalPipelineValue"`
	WonValue           float64 `json:"wonValue"`
	WinRate            float64 `json:"winRate"`
	AvgDealSize        float64 `json:"avgDealSize"`
	AvgSalesCycle      int     `json:"avgSalesCycle"`
}

type StageAnalytics struct {
	StageName string  `json:"stageName"`
	Count     int     `json:"count"`
	Value     float64 `json:"value"`
}

type SourceAnalytics struct {
	Source   string  `json:"source"`
	Count   int     `json:"count"`
	WonCount int    `json:"wonCount"`
	Value   float64 `json:"value"`
}

type MonthlyTrend struct {
	Month    string  `json:"month"`
	NewLeads int     `json:"newLeads"`
	WonLeads int     `json:"wonLeads"`
	LostLeads int   `json:"lostLeads"`
	WonValue float64 `json:"wonValue"`
}

type FunnelStage struct {
	Stage   string  `json:"stage"`
	Count   int     `json:"count"`
	Dropoff float64 `json:"dropoff"`
}
