package ports

import (
	"context"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
)

type UserRepository interface {
	GetByUserID(ctx context.Context, user_id int64) (models.User, error)
	Save(ctx context.Context, user models.User) error
	Delete(ctx context.Context, user_id int64) error
	Update(ctx context.Context, user_id int64, user models.User) (models.User, error)
}
