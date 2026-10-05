package adapterModels

import (
	"github.com/google/uuid"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
)

type Plan struct {
	Id                uuid.UUID         `gorm:"column:id;primaryKey"`
	Utgid             int64             `gorm:"column:utgid"`
	Date              int64             `gorm:"column:date"`
	CaloriesToConsume int               `gorm:"column:calories_to_consume"`
	CaloriesToBurn    int               `gorm:"column:calories_to_burn"`
	Recommendation    string            `gorm:"column:recommendation"`
	Type              models.ActionType `gorm:"column:type"`
	ProfileHash       string            `gorm:"column:profile_hash"`
}
