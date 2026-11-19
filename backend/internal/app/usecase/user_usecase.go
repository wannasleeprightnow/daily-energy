package usecase

import (
	"context"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/domain/ports"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
)

type UserUseCase struct {
	repo ports.UserRepository
}

func NewUserUseCase(repo ports.UserRepository) *UserUseCase {
	return &UserUseCase{repo: repo}
}

func (uc *UserUseCase) Execute(ctx context.Context, user_id int64) (models.User, error) {
	return uc.repo.GetByUserID(ctx, user_id)
}

func (uc *UserUseCase) Add(ctx context.Context, user models.User) error {
	return uc.repo.Save(ctx, user)
}

func (uc *UserUseCase) Update(ctx context.Context, user_id int64, req dto.UserRequest) (models.User, error) {
	return uc.repo.Update(ctx, user_id, req.ToUser())
}

func (uc *UserUseCase) Delete(ctx context.Context, user_id int64) error {
	return uc.repo.Delete(ctx, user_id)
}
