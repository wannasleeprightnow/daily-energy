package dto

import "github.com/isiyar/daily-energy/backend/internal/domain/models"

type UserRequest struct {
	Name             string                  `json:"name" validate:"required,min=1,max=50"`
	Gender           models.Gender           `json:"gender" validate:"required"`
	DateofBirth      int64                   `json:"date_of_birth" validate:"required"`
	Weight           int                     `json:"weight" validate:"required,min=30,max=300"`
	Height           int                     `json:"height" validate:"required,min=100,max=250"`
	Goal             models.Goal             `json:"goal" validate:"required"`
	PhysicalActivity models.PhysicalActivity `json:"physical_activity" validate:"required"`
}
