package adapterModels

import (
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
)

type User struct {
	UserID             int64                   `gorm:"column:user_id;primaryKey"`
	Name              string                  `gorm:"column:name"`
	Gender            models.Gender           `gorm:"column:gender"`
	DateofBirth       int64                   `gorm:"column:date"`
	Weight            int                     `gorm:"column:weight"`
	Height            int                     `gorm:"column:height"`
	Goal              models.Goal             `gorm:"column:goal"`
	PhysicalActivity  models.PhysicalActivity `gorm:"column:physical_activity"`
	Actions           []Action                `gorm:"foreignKey:UserID;references:UserID;constraint:OnDelete:CASCADE"`
	Plans             []Plan                  `gorm:"foreignKey:UserID;references:UserID;constraint:OnDelete:CASCADE"`
	UserWeightHistory []UserWeightHistory     `gorm:"foreignKey:UserID;references:UserID;constraint:OnDelete:CASCADE"`
}
