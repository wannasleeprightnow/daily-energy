package dto

import "github.com/isiyar/daily-energy/backend/internal/domain/models"

type UserWeightHistoryResponse struct {
	Utgid  int64 `json:"utgid"`
	Date   int64 `json:"date" `
	Weight int   `json:"weight" validate:"required,min=30,max=300"`
	Height int   `json:"height" validate:"required,min=100,max=250"`
}

func ToUserWeightHistoryResponse(uwh models.UserWeightHistory) UserWeightHistoryResponse {
	return UserWeightHistoryResponse{
		Utgid:  uwh.Utgid,
		Date:   uwh.Date,
		Weight: uwh.UserWeight,
		Height: uwh.UserHeight,
	}
}
