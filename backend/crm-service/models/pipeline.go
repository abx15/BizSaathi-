package models

import "time"

type Pipeline struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenantId"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	Stages      []Stage   `json:"stages"`
	IsDefault   bool      `json:"isDefault"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Stage struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Order int    `json:"order"`
	Color string `json:"color"`
}

type CreatePipelineInput struct {
	Name        string  `json:"name" validate:"required,max=100"`
	Description string  `json:"description"`
	Stages      []Stage `json:"stages" validate:"required,min=1"`
}

type UpdateStagesInput struct {
	Stages []Stage `json:"stages" validate:"required,min=1"`
}
