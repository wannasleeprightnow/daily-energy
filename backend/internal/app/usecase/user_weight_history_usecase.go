package usecase

import (
	"context"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/domain/ports"
)

type UserWeightHistoryUseCase struct {
	repo ports.UserWeightHistoryRepository
}

func NewUserWeightHistoryUseCase(repo ports.UserWeightHistoryRepository) *UserWeightHistoryUseCase {
	return &UserWeightHistoryUseCase{repo: repo}
}

func (uwc *UserWeightHistoryUseCase) Add(ctx context.Context, userWeightHistory models.UserWeightHistory) error {
	return uwc.repo.Save(ctx, userWeightHistory)
}

func (uwc *UserWeightHistoryUseCase) GetUserWeightHistory(ctx context.Context, user_id int64) ([]models.UserWeightHistory, error) {
	return uwc.repo.GetUserWeightHistory(ctx, user_id)
}
