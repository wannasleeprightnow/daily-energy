package dto

import "github.com/isiyar/daily-energy/backend/internal/domain/models"

type ActionResponse struct {
	Id           string            `json:"id"`
	UserID        int64             `json:"user_id"`
	Date         int64             `json:"date"`
	ActivityName string            `json:"activity_name"`
	Calories     int               `json:"calories"`
	Type         models.ActionType `json:"type"`
}

func ToActionResponse(a models.Action) ActionResponse {
	return ActionResponse{
		Id:           a.Id,
		UserID:        a.UserID,
		Date:         a.Date,
		ActivityName: a.ActivityName,
		Calories:     a.Calories,
		Type:         a.Type,
	}
}

func ToActionsResponse(actions []models.Action) []ActionResponse {
	res := make([]ActionResponse, len(actions))
	for i, a := range actions {
		res[i] = ToActionResponse(a)
	}
	return res
}
