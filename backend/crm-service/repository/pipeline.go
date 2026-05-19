package repository

import (
	"context"
	"encoding/json"

	"github.com/bizsaathi/crm-service/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PipelineRepo struct {
	db *pgxpool.Pool
}

func NewPipelineRepo(db *pgxpool.Pool) *PipelineRepo {
	return &PipelineRepo{db: db}
}

func (r *PipelineRepo) FindAll(ctx context.Context, tenantID string) ([]models.Pipeline, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tenant_id, name, description, stages, is_default, created_at, updated_at
		 FROM crm_pipelines WHERE tenant_id = $1 ORDER BY created_at`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pipelines []models.Pipeline
	for rows.Next() {
		var p models.Pipeline
		var stagesJSON []byte
		var desc *string
		if err := rows.Scan(&p.ID, &p.TenantID, &p.Name, &desc, &stagesJSON, &p.IsDefault, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if desc != nil {
			p.Description = *desc
		}
		_ = json.Unmarshal(stagesJSON, &p.Stages)
		pipelines = append(pipelines, p)
	}
	return pipelines, nil
}

func (r *PipelineRepo) FindByID(ctx context.Context, id, tenantID string) (*models.Pipeline, error) {
	var p models.Pipeline
	var stagesJSON []byte
	var desc *string
	err := r.db.QueryRow(ctx,
		`SELECT id, tenant_id, name, description, stages, is_default, created_at, updated_at
		 FROM crm_pipelines WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	).Scan(&p.ID, &p.TenantID, &p.Name, &desc, &stagesJSON, &p.IsDefault, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if desc != nil {
		p.Description = *desc
	}
	_ = json.Unmarshal(stagesJSON, &p.Stages)
	return &p, nil
}

func (r *PipelineRepo) Create(ctx context.Context, p *models.Pipeline) error {
	stagesJSON, _ := json.Marshal(p.Stages)
	return r.db.QueryRow(ctx,
		`INSERT INTO crm_pipelines (tenant_id, name, description, stages, is_default)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`,
		p.TenantID, p.Name, p.Description, stagesJSON, p.IsDefault,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (r *PipelineRepo) UpdateStages(ctx context.Context, id, tenantID string, stages []models.Stage) error {
	stagesJSON, _ := json.Marshal(stages)
	_, err := r.db.Exec(ctx,
		`UPDATE crm_pipelines SET stages = $1, updated_at = NOW()
		 WHERE id = $2 AND tenant_id = $3`,
		stagesJSON, id, tenantID,
	)
	return err
}

func (r *PipelineRepo) HasLeadsInStage(ctx context.Context, tenantID, stageID string) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM crm_leads
		 WHERE tenant_id = $1 AND stage_id = $2 AND status = 'OPEN'`,
		tenantID, stageID,
	).Scan(&count)
	return count > 0, err
}
