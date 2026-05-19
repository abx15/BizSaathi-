package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/bizsaathi/crm-service/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LeadRepo struct {
	db *pgxpool.Pool
}

func NewLeadRepo(db *pgxpool.Pool) *LeadRepo {
	return &LeadRepo{db: db}
}

func (r *LeadRepo) Create(ctx context.Context, l *models.Lead) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO crm_leads (tenant_id, contact_id, pipeline_id, stage_id, title, description,
		 value, currency, probability, status, priority, expected_close_date, assigned_to, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		 RETURNING id, created_at, updated_at`,
		l.TenantID, l.ContactID, l.PipelineID, l.StageID, l.Title, l.Description,
		l.Value, l.Currency, l.Probability, l.Status, l.Priority,
		l.ExpectedCloseDate, l.AssignedTo, l.CreatedBy,
	).Scan(&l.ID, &l.CreatedAt, &l.UpdatedAt)
}

func (r *LeadRepo) FindByID(ctx context.Context, id, tenantID string) (*models.Lead, error) {
	var l models.Lead
	var desc, lostReason, assignedTo, createdBy, contactID, pipelineID *string
	var expectedClose, actualClose *time.Time
	err := r.db.QueryRow(ctx,
		`SELECT l.id, l.tenant_id, l.contact_id, l.pipeline_id, l.stage_id, l.title, l.description,
		 l.value, l.currency, l.probability, l.status, l.priority,
		 l.expected_close_date, l.actual_close_date, l.lost_reason, l.assigned_to, l.created_by,
		 l.created_at, l.updated_at, COALESCE(c.name, '') as contact_name
		 FROM crm_leads l LEFT JOIN crm_contacts c ON l.contact_id = c.id
		 WHERE l.id = $1 AND l.tenant_id = $2`, id, tenantID,
	).Scan(&l.ID, &l.TenantID, &contactID, &pipelineID, &l.StageID, &l.Title, &desc,
		&l.Value, &l.Currency, &l.Probability, &l.Status, &l.Priority,
		&expectedClose, &actualClose, &lostReason, &assignedTo, &createdBy,
		&l.CreatedAt, &l.UpdatedAt, &l.ContactName)
	if err != nil {
		return nil, err
	}
	if contactID != nil { l.ContactID = *contactID }
	if pipelineID != nil { l.PipelineID = *pipelineID }
	if desc != nil { l.Description = *desc }
	if lostReason != nil { l.LostReason = *lostReason }
	if assignedTo != nil { l.AssignedTo = *assignedTo }
	if createdBy != nil { l.CreatedBy = *createdBy }
	l.ExpectedCloseDate = expectedClose
	l.ActualCloseDate = actualClose
	return &l, nil
}

func (r *LeadRepo) FindAll(ctx context.Context, tenantID string, f models.LeadFilter) ([]models.Lead, int64, error) {
	where := []string{"l.tenant_id = $1"}
	args := []interface{}{tenantID}
	idx := 2
	add := func(clause, val string) { where = append(where, fmt.Sprintf(clause, idx)); args = append(args, val); idx++ }

	if f.Status != "" { add("l.status = $%d", f.Status) }
	if f.StageID != "" { add("l.stage_id = $%d", f.StageID) }
	if f.PipelineID != "" { add("l.pipeline_id = $%d", f.PipelineID) }
	if f.ContactID != "" { add("l.contact_id = $%d", f.ContactID) }
	if f.Priority != "" { add("l.priority = $%d", f.Priority) }
	if f.AssignedTo != "" { add("l.assigned_to = $%d", f.AssignedTo) }
	if f.From != "" { add("l.created_at >= $%d", f.From) }
	if f.To != "" { add("l.created_at <= $%d", f.To) }
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(l.title ILIKE $%d OR c.name ILIKE $%d)", idx, idx))
		args = append(args, "%"+f.Search+"%"); idx++
	}

	wc := strings.Join(where, " AND ")
	var total int64
	r.db.QueryRow(ctx, "SELECT COUNT(*) FROM crm_leads l LEFT JOIN crm_contacts c ON l.contact_id=c.id WHERE "+wc, args...).Scan(&total)

	q := fmt.Sprintf(`SELECT l.id, l.tenant_id, l.contact_id, l.pipeline_id, l.stage_id, l.title, l.description,
		l.value, l.currency, l.probability, l.status, l.priority, l.expected_close_date, l.actual_close_date,
		l.lost_reason, l.assigned_to, l.created_by, l.created_at, l.updated_at, COALESCE(c.name,'')
		FROM crm_leads l LEFT JOIN crm_contacts c ON l.contact_id=c.id WHERE %s ORDER BY l.created_at DESC LIMIT $%d OFFSET $%d`, wc, idx, idx+1)
	args = append(args, f.Limit, f.Offset)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil { return nil, 0, err }
	defer rows.Close()

	var leads []models.Lead
	for rows.Next() {
		var l models.Lead
		var d, lr, at, cb, ci, pi *string
		var ec, ac *time.Time
		rows.Scan(&l.ID, &l.TenantID, &ci, &pi, &l.StageID, &l.Title, &d,
			&l.Value, &l.Currency, &l.Probability, &l.Status, &l.Priority, &ec, &ac,
			&lr, &at, &cb, &l.CreatedAt, &l.UpdatedAt, &l.ContactName)
		if ci != nil { l.ContactID = *ci }
		if pi != nil { l.PipelineID = *pi }
		if d != nil { l.Description = *d }
		if lr != nil { l.LostReason = *lr }
		if at != nil { l.AssignedTo = *at }
		if cb != nil { l.CreatedBy = *cb }
		l.ExpectedCloseDate = ec; l.ActualCloseDate = ac
		leads = append(leads, l)
	}
	return leads, total, nil
}

func (r *LeadRepo) FindKanbanGrouped(ctx context.Context, tenantID, pipelineID string) (map[string][]models.KanbanLead, error) {
	rows, err := r.db.Query(ctx,
		`SELECT l.id, l.title, COALESCE(c.name,''), l.value, l.priority, l.stage_id, l.updated_at,
		 (SELECT f.due_at FROM crm_followups f WHERE f.lead_id=l.id AND f.is_done=false ORDER BY f.due_at LIMIT 1)
		 FROM crm_leads l LEFT JOIN crm_contacts c ON l.contact_id=c.id
		 WHERE l.tenant_id=$1 AND l.pipeline_id=$2 AND l.status='OPEN' ORDER BY l.created_at`,
		tenantID, pipelineID)
	if err != nil { return nil, err }
	defer rows.Close()

	grouped := make(map[string][]models.KanbanLead)
	for rows.Next() {
		var kl models.KanbanLead
		var stageID string; var updAt time.Time; var nf *time.Time
		rows.Scan(&kl.ID, &kl.Title, &kl.ContactName, &kl.Value, &kl.Priority, &stageID, &updAt, &nf)
		kl.DaysInStage = int(time.Since(updAt).Hours() / 24)
		kl.NextFollowup = nf
		grouped[stageID] = append(grouped[stageID], kl)
	}
	return grouped, nil
}

func (r *LeadRepo) Update(ctx context.Context, id, tenantID string, input models.UpdateLeadInput) error {
	s := []string{}; a := []interface{}{}; i := 1
	af := func(f string, v interface{}) { s = append(s, fmt.Sprintf("%s=$%d", f, i)); a = append(a, v); i++ }
	if input.Title != nil { af("title", *input.Title) }
	if input.Description != nil { af("description", *input.Description) }
	if input.Value != nil { af("value", *input.Value) }
	if input.Probability != nil { af("probability", *input.Probability) }
	if input.Priority != nil { af("priority", *input.Priority) }
	if input.ExpectedCloseDate != nil { af("expected_close_date", *input.ExpectedCloseDate) }
	if input.AssignedTo != nil { af("assigned_to", *input.AssignedTo) }
	if len(s) == 0 { return nil }
	s = append(s, "updated_at=NOW()")
	q := fmt.Sprintf("UPDATE crm_leads SET %s WHERE id=$%d AND tenant_id=$%d", strings.Join(s, ","), i, i+1)
	a = append(a, id, tenantID)
	_, err := r.db.Exec(ctx, q, a...)
	return err
}

func (r *LeadRepo) UpdateStage(ctx context.Context, id, tenantID, stageID string) error {
	_, err := r.db.Exec(ctx, `UPDATE crm_leads SET stage_id=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3`, stageID, id, tenantID)
	return err
}

func (r *LeadRepo) MarkWon(ctx context.Context, id, tenantID string, closeDate time.Time) error {
	_, err := r.db.Exec(ctx, `UPDATE crm_leads SET status='WON', actual_close_date=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3`, closeDate, id, tenantID)
	return err
}

func (r *LeadRepo) MarkLost(ctx context.Context, id, tenantID, reason string) error {
	_, err := r.db.Exec(ctx, `UPDATE crm_leads SET status='LOST', lost_reason=$1, actual_close_date=NOW(), updated_at=NOW() WHERE id=$2 AND tenant_id=$3`, reason, id, tenantID)
	return err
}

func (r *LeadRepo) GetAnalytics(ctx context.Context, tenantID, from, to string) (*models.CRMAnalytics, error) {
	a := &models.CRMAnalytics{}
	r.db.QueryRow(ctx,
		`SELECT COUNT(*), COUNT(*) FILTER(WHERE status='OPEN'), COUNT(*) FILTER(WHERE status='WON'),
		 COUNT(*) FILTER(WHERE status='LOST'), COALESCE(SUM(value) FILTER(WHERE status='OPEN'),0),
		 COALESCE(SUM(value) FILTER(WHERE status='WON'),0),
		 CASE WHEN COUNT(*) FILTER(WHERE status IN('WON','LOST'))>0
			THEN ROUND(COUNT(*) FILTER(WHERE status='WON')::NUMERIC*100.0/COUNT(*) FILTER(WHERE status IN('WON','LOST')),1) ELSE 0 END,
		 CASE WHEN COUNT(*) FILTER(WHERE status='WON')>0
			THEN ROUND(SUM(value) FILTER(WHERE status='WON')/COUNT(*) FILTER(WHERE status='WON'),0) ELSE 0 END,
		 COALESCE(AVG(EXTRACT(DAY FROM actual_close_date-created_at)) FILTER(WHERE status='WON'),0)
		 FROM crm_leads WHERE tenant_id=$1 AND created_at>=$2 AND created_at<=$3`, tenantID, from, to,
	).Scan(&a.Summary.TotalLeads, &a.Summary.OpenLeads, &a.Summary.WonLeads, &a.Summary.LostLeads,
		&a.Summary.TotalPipelineValue, &a.Summary.WonValue, &a.Summary.WinRate, &a.Summary.AvgDealSize, &a.Summary.AvgSalesCycle)

	sr, _ := r.db.Query(ctx,
		`SELECT COALESCE(c.source,'unknown'), COUNT(*), COUNT(*) FILTER(WHERE l.status='WON'), COALESCE(SUM(l.value),0)
		 FROM crm_leads l LEFT JOIN crm_contacts c ON l.contact_id=c.id
		 WHERE l.tenant_id=$1 AND l.created_at>=$2 AND l.created_at<=$3 GROUP BY c.source ORDER BY COUNT(*) DESC`, tenantID, from, to)
	if sr != nil {
		defer sr.Close()
		for sr.Next() { var s models.SourceAnalytics; sr.Scan(&s.Source, &s.Count, &s.WonCount, &s.Value); a.BySource = append(a.BySource, s) }
	}

	tr, _ := r.db.Query(ctx,
		`SELECT TO_CHAR(created_at,'YYYY-MM'), COUNT(*), COUNT(*) FILTER(WHERE status='WON'),
		 COUNT(*) FILTER(WHERE status='LOST'), COALESCE(SUM(value) FILTER(WHERE status='WON'),0)
		 FROM crm_leads WHERE tenant_id=$1 AND created_at>=$2 AND created_at<=$3 GROUP BY 1 ORDER BY 1`, tenantID, from, to)
	if tr != nil {
		defer tr.Close()
		for tr.Next() { var t models.MonthlyTrend; tr.Scan(&t.Month, &t.NewLeads, &t.WonLeads, &t.LostLeads, &t.WonValue); a.MonthlyTrend = append(a.MonthlyTrend, t) }
	}
	return a, nil
}
