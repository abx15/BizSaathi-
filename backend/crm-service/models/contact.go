package models

import "time"

type Contact struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenantId"`
	Name        string    `json:"name"`
	Phone       string    `json:"phone,omitempty"`
	Email       string    `json:"email,omitempty"`
	Company     string    `json:"company,omitempty"`
	GSTIN       string    `json:"gstin,omitempty"`
	Designation string    `json:"designation,omitempty"`
	Address     string    `json:"address,omitempty"`
	City        string    `json:"city,omitempty"`
	State       string    `json:"state,omitempty"`
	Source      string    `json:"source,omitempty"`
	Tags        []string  `json:"tags"`
	Notes       string    `json:"notes,omitempty"`
	AvatarURL   string    `json:"avatarUrl,omitempty"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateContactInput struct {
	Name        string   `json:"name" validate:"required,max=200"`
	Phone       string   `json:"phone"`
	Email       string   `json:"email" validate:"omitempty,email"`
	Company     string   `json:"company"`
	GSTIN       string   `json:"gstin"`
	Designation string   `json:"designation"`
	Address     string   `json:"address"`
	City        string   `json:"city"`
	State       string   `json:"state"`
	Source      string   `json:"source"`
	Tags        []string `json:"tags"`
	Notes       string   `json:"notes"`
}

type UpdateContactInput struct {
	Name        *string  `json:"name"`
	Phone       *string  `json:"phone"`
	Email       *string  `json:"email"`
	Company     *string  `json:"company"`
	GSTIN       *string  `json:"gstin"`
	Designation *string  `json:"designation"`
	Address     *string  `json:"address"`
	City        *string  `json:"city"`
	State       *string  `json:"state"`
	Source      *string  `json:"source"`
	Tags        []string `json:"tags"`
	Notes       *string  `json:"notes"`
}

type ContactFilter struct {
	Search string
	City   string
	Source string
	Tags   string
	Page   int
	Limit  int
	Offset int
}
