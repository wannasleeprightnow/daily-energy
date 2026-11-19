package dto

import "github.com/isiyar/daily-energy/backend/internal/domain/models"

type UserWeightHistoryResponse struct {
	UserID  int64 `json:"user_id"`
	Date   int64 `json:"date" `
	Weight int   `json:"weight" validate:"required,min=30,max=300"`
	Height int   `json:"height" validate:"required,min=100,max=250"`
}

func ToUserWeightHistoryResponse(uwh models.UserWeightHistory) UserWeightHistoryResponse {
	return UserWeightHistoryResponse{
		UserID:  uwh.UserID,
		Date:   uwh.Date,
		Weight: uwh.UserWeight,
		Height: uwh.UserHeight,
	}
}
