package dto

import (
	"github.com/google/uuid"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
)

type UserWeightHistoryCreate struct {
	Date   int64 `json:"date" validate:"required"`
	Weight int   `json:"weight" validate:"required,min=30,max=300"`
	Height int   `json:"height" validate:"required,min=100,max=250"`
}

func (uw *UserWeightHistoryCreate) ToUserWeightHistory(utgid int64) models.UserWeightHistory {
	return models.UserWeightHistory{
		Id:         uuid.New().String(),
		Utgid:      utgid,
		Date:       uw.Date,
		UserWeight: uw.Weight,
		UserHeight: uw.Height,
	}
}
