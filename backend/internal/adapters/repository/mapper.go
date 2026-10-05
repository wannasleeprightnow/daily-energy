package repository

import (
	"github.com/google/uuid"
	"github.com/isiyar/daily-energy/backend/internal/adapters/adapterModels"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
)

func toDomainUser(u adapterModels.User) models.User {
	return models.User{
		Utgid:             u.Utgid,
		Name:              u.Name,
		Gender:            u.Gender,
		DateofBirth:       u.DateofBirth,
		Weight:            u.Weight,
		Height:            u.Height,
		Goal:              u.Goal,
		PhysicalActivity:  u.PhysicalActivity,
		Actions:           toDomainActions(u.Actions),
		Plans:             toDomainPlans(u.Plans),
		UserWeightHistory: toDomainUserWeightHistory(u.UserWeightHistory),
	}
}

func toAdapterUser(u models.User) adapterModels.User {
	return adapterModels.User{
		Utgid:             u.Utgid,
		Name:              u.Name,
		Gender:            u.Gender,
		DateofBirth:       u.DateofBirth,
		Weight:            u.Weight,
		Height:            u.Height,
		Goal:              u.Goal,
		PhysicalActivity:  u.PhysicalActivity,
		Actions:           toAdapterActions(u.Actions),
		Plans:             toAdapterPlans(u.Plans),
		UserWeightHistory: toAdapterUserWeightHistory(u.UserWeightHistory),
	}
}

func toDomainAction(a adapterModels.Action) models.Action {
	return models.Action{
		Id:           a.Id.String(),
		Utgid:        a.Utgid,
		Date:         a.Date,
		ActivityName: a.ActivityName,
		Calories:     a.Calories,
		Type:         a.Type,
	}
}

func toDomainActions(actions []adapterModels.Action) []models.Action {
	if actions == nil {
		return nil
	}
	res := make([]models.Action, len(actions))
	for i, a := range actions {
		res[i] = toDomainAction(a)
	}
	return res
}

func toAdapterAction(a models.Action) adapterModels.Action {
	id, err := uuid.Parse(a.Id)
	if err != nil {
		return adapterModels.Action{}
	}
	return adapterModels.Action{
		Id:           id,
		Utgid:        a.Utgid,
		Date:         a.Date,
		ActivityName: a.ActivityName,
		Calories:     a.Calories,
		Type:         a.Type,
	}
}

func toAdapterActions(actions []models.Action) []adapterModels.Action {
	if actions == nil {
		return nil
	}
	res := make([]adapterModels.Action, len(actions))
	for i, a := range actions {
		res[i] = toAdapterAction(a)
	}
	return res
}

func toDomainPlans(plans []adapterModels.Plan) []models.Plan {
	if plans == nil {
		return nil
	}
	res := make([]models.Plan, len(plans))
	for i, p := range plans {
		res[i] = models.Plan{
			Id:                p.Id.String(),
			Utgid:             p.Utgid,
			Date:              p.Date,
			CaloriesToConsume: p.CaloriesToConsume,
			CaloriesToBurn:    p.CaloriesToBurn,
			Recommendation:    p.Recommendation,
			Type:              p.Type,
			ProfileHash:       p.ProfileHash,
		}
	}
	return res
}

func toAdapterPlans(plans []models.Plan) []adapterModels.Plan {
	if plans == nil {
		return nil
	}
	res := make([]adapterModels.Plan, len(plans))
	for i, p := range plans {
		id, err := uuid.Parse(p.Id)
		if err != nil {
			continue
		}
		res[i] = adapterModels.Plan{
			Id:                id,
			Utgid:             p.Utgid,
			Date:              p.Date,
			CaloriesToConsume: p.CaloriesToConsume,
			CaloriesToBurn:    p.CaloriesToBurn,
			Recommendation:    p.Recommendation,
			Type:              p.Type,
			ProfileHash:       p.ProfileHash,
		}
	}
	return res
}

func toDomainUserWeightHistory(histories []adapterModels.UserWeightHistory) []models.UserWeightHistory {
	if histories == nil {
		return nil
	}
	res := make([]models.UserWeightHistory, len(histories))
	for i, h := range histories {
		res[i] = models.UserWeightHistory{
			Id:         h.Id.String(),
			Utgid:      h.Utgid,
			Date:       h.Date,
			UserWeight: h.UserWeight,
			UserHeight: h.UserHeight,
		}
	}
	return res
}

func toAdapterUserWeightHistory(histories []models.UserWeightHistory) []adapterModels.UserWeightHistory {
	if histories == nil {
		return nil
	}
	res := make([]adapterModels.UserWeightHistory, len(histories))
	for i, h := range histories {
		id, err := uuid.Parse(h.Id)
		if err != nil {
			continue
		}
		res[i] = adapterModels.UserWeightHistory{
			Id:         id,
			Utgid:      h.Utgid,
			Date:       h.Date,
			UserWeight: h.UserWeight,
			UserHeight: h.UserHeight,
		}
	}
	return res
}
