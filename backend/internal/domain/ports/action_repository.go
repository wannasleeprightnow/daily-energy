package ports

import (
	"context"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
)

type ActionRepository interface {
	GetById(ctx context.Context, id string) (models.Action, error)
	GetByStartTimeAndFinishTime(ctx context.Context, startAt, finishAt, user_id int64) ([]models.Action, error)
	GetByStartTimeAndFinishTimeAndType(ctx context.Context, startAt, finishAt, user_id int64, actionType string) ([]models.Action, error)
	Save(ctx context.Context, action *models.Action) error
}
