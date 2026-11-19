package dto

import "github.com/isiyar/daily-energy/backend/internal/domain/models"

type PlanResponse struct {
	Id                string            `json:"id"`
	UserID             int64             `json:"user_id"`
	Date              int64             `json:"date"`
	CaloriesToConsume int               `json:"calories_to_consume"`
	CaloriesToBurn    int               `json:"calories_to_burn"`
	Recommendation    string            `json:"recommendation"`
	Type              models.ActionType `json:"type"`
}

type DailyPlan struct {
	Calories        int      `json:"calories"`
	Recommendations []string `json:"recommendations"`
}

type AIPlanContent struct {
	Nutrition map[string]DailyPlan `json:"nutrition"`
	Workouts  map[string]DailyPlan `json:"workouts"`
}

func ToPlanResponse(p models.Plan) PlanResponse {
	return PlanResponse{
		Id:                p.Id,
		UserID:             p.UserID,
		Date:              p.Date,
		CaloriesToConsume: p.CaloriesToConsume,
		CaloriesToBurn:    p.CaloriesToBurn,
		Recommendation:    p.Recommendation,
		Type:              p.Type,
	}
}

func ToPlansResponse(plans []models.Plan) []PlanResponse {
	res := make([]PlanResponse, len(plans))
	for i, p := range plans {
		res[i] = ToPlanResponse(p)
	}
	return res
}
