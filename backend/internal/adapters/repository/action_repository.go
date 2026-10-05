package repository

import (
	"context"
	"github.com/google/uuid"
	"github.com/isiyar/daily-energy/backend/internal/adapters/adapterModels"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/domain/ports"
	"gorm.io/gorm"
)

type actionRepository struct {
	db *gorm.DB
}

func NewActionRepository(db *gorm.DB) ports.ActionRepository {
	return &actionRepository{db: db}
}

func (r *actionRepository) GetById(ctx context.Context, id string) (models.Action, error) {
	aid, err := uuid.Parse(id)
	if err != nil {
		return models.Action{}, err
	}

	var a adapterModels.Action
	if err := r.db.WithContext(ctx).First(&a, "id = ?", aid).Error; err != nil {
		return models.Action{}, err
	}
	return toDomainAction(a), nil
}

func (r *actionRepository) GetByStartTimeAndFinishTime(ctx context.Context, startAt, finishAt, utgid int64) ([]models.Action, error) {
	var adapterActions []adapterModels.Action

	err := r.db.WithContext(ctx).
		Where("utgid = ? AND date BETWEEN ? AND ?", utgid, startAt, finishAt).
		Order("date DESC").
		Find(&adapterActions).Error

	if err != nil {
		return nil, err
	}

	return toDomainActions(adapterActions), nil
}

func (r *actionRepository) GetByStartTimeAndFinishTimeAndType(ctx context.Context, startAt, finishAt, utgid int64, actionType string) ([]models.Action, error) {
	var adapterActions []adapterModels.Action

	err := r.db.WithContext(ctx).
		Where("utgid = ? AND type = ? AND date BETWEEN ? AND ?", utgid, actionType, startAt, finishAt).
		Order("date DESC").
		Find(&adapterActions).Error

	if err != nil {
		return nil, err
	}

	return toDomainActions(adapterActions), nil
}

func (r *actionRepository) Save(ctx context.Context, action *models.Action) error {
	actionAdapter := toAdapterAction(*action)
	if err := r.db.WithContext(ctx).Save(&actionAdapter).Error; err != nil {
		return err
	}
	return nil
}
