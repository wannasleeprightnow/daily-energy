package repository

import (
	"context"
	"github.com/isiyar/daily-energy/backend/internal/adapters/adapterModels"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/domain/ports"
	"golang.org/x/crypto/openpgp/errors"
	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) ports.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetByUtgid(ctx context.Context, utgid int64) (models.User, error) {
	var u adapterModels.User
	if err := r.db.WithContext(ctx).First(&u, "utgid = ?", utgid).Error; err != nil {
		return models.User{}, err
	}
	return toDomainUser(u), nil
}

func (r *userRepository) Save(ctx context.Context, user models.User) error {
	userAdapter := toAdapterUser(user)
	if err := r.db.WithContext(ctx).Save(&userAdapter).Error; err != nil {
		return err
	}
	return nil
}

func (r *userRepository) Delete(ctx context.Context, utgid int64) error {
	res := r.db.WithContext(ctx).Delete(&adapterModels.User{}, "utgid = ?", utgid)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.ErrKeyIncorrect
	}
	return nil
}

func (r *userRepository) Update(
	ctx context.Context, utgid int64, user models.User) (models.User, error) {
	userAdapter := toAdapterUser(user)
	var updated adapterModels.User
	if err := r.db.WithContext(ctx).Model(&adapterModels.User{}).Where("utgid = ?", utgid).Updates(userAdapter).First(&updated).Error; err != nil {
		return models.User{}, err
	}
	return toDomainUser(updated), nil
}
