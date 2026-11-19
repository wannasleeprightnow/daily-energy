package repository

import (
	"context"
	"github.com/isiyar/daily-energy/backend/internal/adapters/adapterModels"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/domain/ports"
	"gorm.io/gorm"
)

type userWeightHistoryRepository struct {
	db *gorm.DB
}

func NewUserWeightHistoryRepository(db *gorm.DB) ports.UserWeightHistoryRepository {
	return &userWeightHistoryRepository{db: db}
}

func (r *userWeightHistoryRepository) Save(ctx context.Context, userWeightHistory models.UserWeightHistory) error {
	userWeightHistoryArray := []models.UserWeightHistory{userWeightHistory}
	userWeightHistoryAdapter := toAdapterUserWeightHistory(userWeightHistoryArray)[0]
	if err := r.db.WithContext(ctx).Save(&userWeightHistoryAdapter).Error; err != nil {
		return err
	}
	return nil
}

func (r *userWeightHistoryRepository) GetUserWeightHistory(ctx context.Context, user_id int64) ([]models.UserWeightHistory, error) {
	var adapterUserWeightHistory []adapterModels.UserWeightHistory

	if err := r.db.WithContext(ctx).Where("user_id = ?", user_id).Find(&adapterUserWeightHistory).Error; err != nil {
		return []models.UserWeightHistory{}, err
	}

	return toDomainUserWeightHistory(adapterUserWeightHistory), nil
}
