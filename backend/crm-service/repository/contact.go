package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/bizsaathi/crm-service/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ContactRepo struct {
	db *pgxpool.Pool
}

func NewContactRepo(db *pgxpool.Pool) *ContactRepo {
	return &ContactRepo{db: db}
}

func (r *ContactRepo) Create(ctx context.Context, c *models.Contact) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO crm_contacts (tenant_id, name, phone, email, company, gstin, designation,
		 address, city, state, source, tags, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		 RETURNING id, is_active, created_at, updated_at`,
		c.TenantID, c.Name, c.Phone, c.Email, c.Company, c.GSTIN, c.Designation,
		c.Address, c.City, c.State, c.Source, c.Tags, c.Notes,
	).Scan(&c.ID, &c.IsActive, &c.CreatedAt, &c.UpdatedAt)
}

func (r *ContactRepo) FindAll(ctx context.Context, tenantID string, f models.ContactFilter) ([]models.Contact, int64, error) {
	where := []string{"tenant_id = $1", "is_active = true"}
	args := []interface{}{tenantID}
	argIdx := 2

	if f.Search != "" {
		where = append(where, fmt.Sprintf(
			"(name ILIKE $%d OR phone ILIKE $%d OR email ILIKE $%d OR company ILIKE $%d)",
			argIdx, argIdx, argIdx, argIdx,
		))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}
	if f.City != "" {
		where = append(where, fmt.Sprintf("city = $%d", argIdx))
		args = append(args, f.City)
		argIdx++
	}
	if f.Source != "" {
		where = append(where, fmt.Sprintf("source = $%d", argIdx))
		args = append(args, f.Source)
		argIdx++
	}

	whereClause := strings.Join(where, " AND ")

	// Count
	var total int64
	countQ := "SELECT COUNT(*) FROM crm_contacts WHERE " + whereClause
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data
	dataQ := fmt.Sprintf(
		`SELECT id, tenant_id, name, phone, email, company, gstin, designation,
		 address, city, state, source, tags, notes, avatar_url, is_active, created_at, updated_at
		 FROM crm_contacts WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		whereClause, argIdx, argIdx+1,
	)
	args = append(args, f.Limit, f.Offset)

	rows, err := r.db.Query(ctx, dataQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	contacts, err := scanContacts(rows)
	return contacts, total, err
}

func (r *ContactRepo) FindByID(ctx context.Context, id, tenantID string) (*models.Contact, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, tenant_id, name, phone, email, company, gstin, designation,
		 address, city, state, source, tags, notes, avatar_url, is_active, created_at, updated_at
		 FROM crm_contacts WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	)
	return scanContact(row)
}

func (r *ContactRepo) Update(ctx context.Context, id, tenantID string, input models.UpdateContactInput) error {
	sets := []string{}
	args := []interface{}{}
	argIdx := 1

	addField := func(field string, val interface{}) {
		sets = append(sets, fmt.Sprintf("%s = $%d", field, argIdx))
		args = append(args, val)
		argIdx++
	}

	if input.Name != nil {
		addField("name", *input.Name)
	}
	if input.Phone != nil {
		addField("phone", *input.Phone)
	}
	if input.Email != nil {
		addField("email", *input.Email)
	}
	if input.Company != nil {
		addField("company", *input.Company)
	}
	if input.GSTIN != nil {
		addField("gstin", *input.GSTIN)
	}
	if input.Designation != nil {
		addField("designation", *input.Designation)
	}
	if input.Address != nil {
		addField("address", *input.Address)
	}
	if input.City != nil {
		addField("city", *input.City)
	}
	if input.State != nil {
		addField("state", *input.State)
	}
	if input.Source != nil {
		addField("source", *input.Source)
	}
	if input.Notes != nil {
		addField("notes", *input.Notes)
	}
	if input.Tags != nil {
		addField("tags", input.Tags)
	}

	if len(sets) == 0 {
		return nil
	}

	sets = append(sets, "updated_at = NOW()")
	q := fmt.Sprintf("UPDATE crm_contacts SET %s WHERE id = $%d AND tenant_id = $%d",
		strings.Join(sets, ", "), argIdx, argIdx+1,
	)
	args = append(args, id, tenantID)

	_, err := r.db.Exec(ctx, q, args...)
	return err
}

func (r *ContactRepo) SoftDelete(ctx context.Context, id, tenantID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE crm_contacts SET is_active = false, updated_at = NOW()
		 WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	)
	return err
}

func (r *ContactRepo) HasOpenLeads(ctx context.Context, contactID, tenantID string) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM crm_leads
		 WHERE contact_id = $1 AND tenant_id = $2 AND status = 'OPEN'`,
		contactID, tenantID,
	).Scan(&count)
	return count > 0, err
}

func (r *ContactRepo) PhoneExists(ctx context.Context, tenantID, phone, excludeID string) (bool, error) {
	q := `SELECT COUNT(*) FROM crm_contacts WHERE tenant_id = $1 AND phone = $2 AND is_active = true`
	args := []interface{}{tenantID, phone}
	if excludeID != "" {
		q += " AND id != $3"
		args = append(args, excludeID)
	}
	var count int
	err := r.db.QueryRow(ctx, q, args...).Scan(&count)
	return count > 0, err
}

func scanContacts(rows pgx.Rows) ([]models.Contact, error) {
	var contacts []models.Contact
	for rows.Next() {
		c, err := scanContactRow(rows)
		if err != nil {
			return nil, err
		}
		contacts = append(contacts, *c)
	}
	return contacts, nil
}

func scanContactRow(row pgx.Row) (*models.Contact, error) {
	var c models.Contact
	var phone, email, company, gstin, designation, address, city, state, source, notes, avatarURL *string
	err := row.Scan(
		&c.ID, &c.TenantID, &c.Name, &phone, &email, &company, &gstin, &designation,
		&address, &city, &state, &source, &c.Tags, &notes, &avatarURL, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if phone != nil { c.Phone = *phone }
	if email != nil { c.Email = *email }
	if company != nil { c.Company = *company }
	if gstin != nil { c.GSTIN = *gstin }
	if designation != nil { c.Designation = *designation }
	if address != nil { c.Address = *address }
	if city != nil { c.City = *city }
	if state != nil { c.State = *state }
	if source != nil { c.Source = *source }
	if notes != nil { c.Notes = *notes }
	if avatarURL != nil { c.AvatarURL = *avatarURL }
	if c.Tags == nil { c.Tags = []string{} }
	return &c, nil
}

func scanContact(row pgx.Row) (*models.Contact, error) {
	return scanContactRow(row)
}
