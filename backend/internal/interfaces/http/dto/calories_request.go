package dto

import "github.com/isiyar/daily-energy/backend/internal/domain/models"

type CaloriesRequest struct {
	Title string `json:"title" validate:"required"`
}

type ActivityCaloriesRequest struct {
	Title            string                  `json:"title" binding:"required"`
	Weight           int                     `json:"weight" binding:"required"`
	Height           int                     `json:"height" binding:"required"`
	Gender           models.Gender           `json:"gender" binding:"required"`
	DateOfBirth      int64                   `json:"date_of_birth" binding:"required"`
	PhysicalActivity models.PhysicalActivity `json:"physical_activity" binding:"required"`
	DurationMinutes  int                     `json:"duration_minutes" binding:"required"`
}
