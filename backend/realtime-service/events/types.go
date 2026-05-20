package events

import (
	"encoding/json"
	"time"
)

type EventType string

const (
	// Invoice events
	EventInvoiceCreated EventType = "invoice.created"
	EventInvoiceUpdated EventType = "invoice.updated"
	EventInvoicePaid    EventType = "invoice.paid"
	EventInvoiceSent    EventType = "invoice.sent"
	EventInvoiceOverdue EventType = "invoice.overdue"

	// Payment events
	EventPaymentReceived EventType = "payment.received"

	// Expense events
	EventExpenseCreated EventType = "expense.created"

	// Staff events
	EventAttendanceMarked EventType = "attendance.marked"
	EventPayrollProcessed EventType = "payroll.processed"
	EventLeaveApproved    EventType = "leave.approved"
	EventLeaveRejected    EventType = "leave.rejected"

	// CRM events
	EventLeadCreated      EventType = "lead.created"
	EventLeadStageChanged EventType = "lead.stage_changed"
	EventLeadWon          EventType = "lead.won"
	EventLeadLost         EventType = "lead.lost"
	EventFollowupDue      EventType = "followup.due"

	// WhatsApp events
	EventWhatsAppDelivered EventType = "whatsapp.delivered"
	EventWhatsAppRead      EventType = "whatsapp.read"
	EventWhatsAppReply     EventType = "whatsapp.reply"

	// AI events
	EventAIInsightReady EventType = "ai.insight_ready"
	EventAIReportReady  EventType = "ai.report_ready"

	// System events
	EventDashboardRefresh EventType = "dashboard.refresh"
	EventNotification     EventType = "notification"
	EventAlert            EventType = "alert"
)

// Base event envelope
type Event struct {
	ID        string          `json:"id"`
	Type      EventType       `json:"type"`
	TenantID  string          `json:"tenantId"`
	UserID    string          `json:"userId,omitempty"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
}

// Struct definitions for payloads

type InvoicePaidPayload struct {
	InvoiceID     string  `json:"invoiceId"`
	InvoiceNumber string  `json:"invoiceNumber"`
	CustomerName  string  `json:"customerName"`
	Amount        float64 `json:"amount"`
	PaidAt        string  `json:"paidAt"`
}

type NotificationPayload struct {
	Title     string `json:"title"`
	Body      string `json:"body"`
	Icon      string `json:"icon"` // emoji
	ActionURL string `json:"actionUrl,omitempty"`
	Severity  string `json:"severity"` // info | success | warning | error
}

type DashboardRefreshPayload struct {
	Sections []string `json:"sections"`
}
