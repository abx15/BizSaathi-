package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/bizsaathi/crm-service/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ActivityRepo struct {
	db *pgxpool.Pool
}

func NewActivityRepo(db *pgxpool.Pool) *ActivityRepo {
	return &ActivityRepo{db: db}
}

func (r *ActivityRepo) Create(ctx context.Context, a *models.Activity) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO crm_activities (tenant_id, lead_id, contact_id, type, title, description, outcome, scheduled_at, completed_at, is_done, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, created_at`,
		a.TenantID, nilIfEmpty(a.LeadID), nilIfEmpty(a.ContactID), a.Type, a.Title, a.Description,
		a.Outcome, a.ScheduledAt, a.CompletedAt, a.IsDone, a.CreatedBy,
	).Scan(&a.ID, &a.CreatedAt)
}

func (r *ActivityRepo) FindByLead(ctx context.Context, tenantID, leadID string) ([]models.Activity, error) {
	rows, err := r.db.Query(ctx,
		`SELECT a.id, a.tenant_id, a.lead_id, a.contact_id, a.type, a.title, a.description,
		 a.outcome, a.scheduled_at, a.completed_at, a.is_done, a.created_by, a.created_at
		 FROM crm_activities a WHERE a.tenant_id=$1 AND a.lead_id=$2 ORDER BY a.created_at DESC`,
		tenantID, leadID)
	if err != nil { return nil, err }
	defer rows.Close()
	return scanActivities(rows)
}

func (r *ActivityRepo) FindToday(ctx context.Context, tenantID string) ([]models.Activity, error) {
	today := time.Now().Format("2006-01-02")
	rows, err := r.db.Query(ctx,
		`SELECT a.id, a.tenant_id, a.lead_id, a.contact_id, a.type, a.title, a.description,
		 a.outcome, a.scheduled_at, a.completed_at, a.is_done, a.created_by, a.created_at,
		 COALESCE(l.title,'') as lead_title, COALESCE(c.name,'') as contact_name
		 FROM crm_activities a
		 LEFT JOIN crm_leads l ON a.lead_id=l.id
		 LEFT JOIN crm_contacts c ON a.contact_id=c.id
		 WHERE a.tenant_id=$1 AND a.scheduled_at::date=$2 ORDER BY a.scheduled_at`,
		tenantID, today)
	if err != nil { return nil, err }
	defer rows.Close()
	return scanActivitiesJoined(rows)
}

func (r *ActivityRepo) FindUpcoming(ctx context.Context, tenantID string, days int) ([]models.Activity, error) {
	rows, err := r.db.Query(ctx,
		`SELECT a.id, a.tenant_id, a.lead_id, a.contact_id, a.type, a.title, a.description,
		 a.outcome, a.scheduled_at, a.completed_at, a.is_done, a.created_by, a.created_at,
		 COALESCE(l.title,'') as lead_title, COALESCE(c.name,'') as contact_name
		 FROM crm_activities a
		 LEFT JOIN crm_leads l ON a.lead_id=l.id
		 LEFT JOIN crm_contacts c ON a.contact_id=c.id
		 WHERE a.tenant_id=$1 AND a.scheduled_at >= NOW() AND a.scheduled_at <= NOW() + $2::interval AND a.is_done=false
		 ORDER BY a.scheduled_at`,
		tenantID, fmt.Sprintf("%d days", days))
	if err != nil { return nil, err }
	defer rows.Close()
	return scanActivitiesJoined(rows)
}

// Followup methods
func (r *ActivityRepo) CreateFollowup(ctx context.Context, f *models.Followup) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO crm_followups (tenant_id, lead_id, contact_id, title, note, due_at, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
		f.TenantID, nilIfEmpty(f.LeadID), nilIfEmpty(f.ContactID), f.Title, f.Note, f.DueAt, f.CreatedBy,
	).Scan(&f.ID, &f.CreatedAt)
}

func (r *ActivityRepo) FindOverdueFollowups(ctx context.Context, tenantID string) ([]models.Followup, error) {
	rows, err := r.db.Query(ctx,
		`SELECT f.id, f.tenant_id, f.lead_id, f.contact_id, f.title, f.note, f.due_at,
		 f.is_done, f.done_at, f.created_by, f.created_at,
		 COALESCE(l.title,'') as lead_title, COALESCE(c.name,'') as contact_name
		 FROM crm_followups f
		 LEFT JOIN crm_leads l ON f.lead_id=l.id
		 LEFT JOIN crm_contacts c ON f.contact_id=c.id
		 WHERE f.tenant_id=$1 AND f.is_done=false AND f.due_at < NOW()
		 ORDER BY f.due_at`, tenantID)
	if err != nil { return nil, err }
	defer rows.Close()
	return scanFollowups(rows)
}

func (r *ActivityRepo) MarkFollowupDone(ctx context.Context, id, tenantID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE crm_followups SET is_done=true, done_at=NOW() WHERE id=$1 AND tenant_id=$2`, id, tenantID)
	return err
}

func nilIfEmpty(s string) interface{} {
	if s == "" { return nil }
	return s
}

func fmt_Sprintf(format string, a ...interface{}) string {
	return fmt.Sprintf(format, a...)
}

// keep import used
var _ = fmt_Sprintf

func scanActivities(rows interface{ Next() bool; Scan(dest ...interface{}) error }) ([]models.Activity, error) {
	var activities []models.Activity
	for rows.Next() {
		var a models.Activity
		var leadID, contactID, desc, outcome, createdBy *string
		var scheduledAt, completedAt *time.Time
		if err := rows.Scan(&a.ID, &a.TenantID, &leadID, &contactID, &a.Type, &a.Title, &desc,
			&outcome, &scheduledAt, &completedAt, &a.IsDone, &createdBy, &a.CreatedAt); err != nil {
			return nil, err
		}
		if leadID != nil { a.LeadID = *leadID }
		if contactID != nil { a.ContactID = *contactID }
		if desc != nil { a.Description = *desc }
		if outcome != nil { a.Outcome = *outcome }
		if createdBy != nil { a.CreatedBy = *createdBy }
		a.ScheduledAt = scheduledAt; a.CompletedAt = completedAt
		activities = append(activities, a)
	}
	return activities, nil
}

func scanActivitiesJoined(rows interface{ Next() bool; Scan(dest ...interface{}) error }) ([]models.Activity, error) {
	var activities []models.Activity
	for rows.Next() {
		var a models.Activity
		var leadID, contactID, desc, outcome, createdBy *string
		var scheduledAt, completedAt *time.Time
		if err := rows.Scan(&a.ID, &a.TenantID, &leadID, &contactID, &a.Type, &a.Title, &desc,
			&outcome, &scheduledAt, &completedAt, &a.IsDone, &createdBy, &a.CreatedAt,
			&a.LeadTitle, &a.ContactName); err != nil {
			return nil, err
		}
		if leadID != nil { a.LeadID = *leadID }
		if contactID != nil { a.ContactID = *contactID }
		if desc != nil { a.Description = *desc }
		if outcome != nil { a.Outcome = *outcome }
		if createdBy != nil { a.CreatedBy = *createdBy }
		a.ScheduledAt = scheduledAt; a.CompletedAt = completedAt
		activities = append(activities, a)
	}
	return activities, nil
}

func scanFollowups(rows interface{ Next() bool; Scan(dest ...interface{}) error }) ([]models.Followup, error) {
	var followups []models.Followup
	for rows.Next() {
		var f models.Followup
		var leadID, contactID, note, createdBy *string
		var doneAt *time.Time
		if err := rows.Scan(&f.ID, &f.TenantID, &leadID, &contactID, &f.Title, &note, &f.DueAt,
			&f.IsDone, &doneAt, &createdBy, &f.CreatedAt, &f.LeadTitle, &f.ContactName); err != nil {
			return nil, err
		}
		if leadID != nil { f.LeadID = *leadID }
		if contactID != nil { f.ContactID = *contactID }
		if note != nil { f.Note = *note }
		if createdBy != nil { f.CreatedBy = *createdBy }
		f.DoneAt = doneAt
		followups = append(followups, f)
	}
	return followups, nil
}
