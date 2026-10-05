package repository

import (
	"context"
	"github.com/isiyar/daily-energy/backend/internal/adapters/adapterModels"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/domain/ports"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type planRepository struct {
	db *gorm.DB
}

func NewPlanRepository(db *gorm.DB) ports.PlanRepository {
	return &planRepository{db: db}
}

func (r *planRepository) GetByStartTimeAndFinishTime(ctx context.Context, startAt, finishAt, utgid int64) ([]models.Plan, error) {
	var adapterPlans []adapterModels.Plan

	err := r.db.WithContext(ctx).
		Where("utgid = ? AND date BETWEEN ? AND ?", utgid, startAt, finishAt).
		Find(&adapterPlans).Error

	if err != nil {
		return nil, err
	}

	return toDomainPlans(adapterPlans), nil
}

func (r *planRepository) GetByStartTimeAndFinishTimeAndType(ctx context.Context, startAt, finishAt, utgid int64, planType string) ([]models.Plan, error) {
	var adapterPlans []adapterModels.Plan

	err := r.db.WithContext(ctx).
		Where("utgid = ? AND type = ? AND date BETWEEN ? AND ?", utgid, planType, startAt, finishAt).
		Find(&adapterPlans).Error

	if err != nil {
		return nil, err
	}

	return toDomainPlans(adapterPlans), nil
}

func (r *planRepository) Save(ctx context.Context, plans []models.Plan) error {
	plansAdapter := toAdapterPlans(plans)
	if len(plansAdapter) == 0 {
		return nil
	}
	if err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "utgid"}, {Name: "date"}, {Name: "type"}},
		DoUpdates: clause.AssignmentColumns([]string{"calories_to_consume", "calories_to_burn", "recommendation", "profile_hash"}),
	}).Create(&plansAdapter).Error; err != nil {
		return err
	}
	return nil
}
