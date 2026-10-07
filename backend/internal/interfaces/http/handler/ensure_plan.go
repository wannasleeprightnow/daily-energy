package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	_ "time/tzdata"

	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
	"github.com/isiyar/daily-energy/backend/pkg/validator"
)

const planHorizonDays = 7
const planGenerationAttempts = 2

// CreatePlan now ensures a complete seven-day plan. Repeating the request is
// safe: existing days remain untouched unless profile-dependent future plans
// are stale.
func (h *PlanHandler) CreatePlan(c *gin.Context) { h.EnsurePlan(c) }

func (h *PlanHandler) EnsurePlan(c *gin.Context) {
	utgid, ok := authenticatedPlanUser(c)
	if !ok {
		return
	}
	user, err := h.userUC.Execute(c.Request.Context(), utgid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	var request dto.PlanRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}
	if err := validator.Struct(request); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "validation failed", "details": err.Error()})
		return
	}
	timezone := request.Timezone
	if timezone == "" { // Existing clients without the field keep working.
		timezone = "UTC"
	}
	location, err := time.LoadLocation(timezone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid timezone"})
		return
	}
	plans, err := h.ensurePlan(c.Request.Context(), user, timezone, location, time.Now())
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to ensure plan", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dto.ToPlansResponse(plans))
}

func authenticatedPlanUser(c *gin.Context) (int64, bool) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		return 0, false
	}
	if userID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid utgid in URL"})
		return 0, false
	}
	return userID, true
}

func (h *PlanHandler) ensurePlan(ctx context.Context, user models.User, timezone string, location *time.Location, now time.Time) ([]models.Plan, error) {
	localNow := now.In(location)
	dates := planDates(localNow, location)
	today := dates[0]
	dateSet := make(map[int64]bool, planHorizonDays)
	for _, date := range dates {
		dateSet[date.Unix()] = true
	}
	existing, err := h.planUC.GetByStartTimeAndFinishTime(ctx, dates[0].Unix(), dates[len(dates)-1].AddDate(0, 0, 1).Unix(), user.Utgid)
	if err != nil {
		return nil, err
	}
	hash := profileHash(user, localNow, timezone)
	byDateType := make(map[string]models.Plan, len(existing))
	for _, plan := range existing {
		if !dateSet[plan.Date] {
			continue
		}
		key := fmt.Sprintf("%d:%s", plan.Date, plan.Type)
		byDateType[key] = plan
	}
	staleFuture := hasStaleFuturePlans(existing, dateSet, today.Unix(), hash)
	targetDates := make([]time.Time, 0, planHorizonDays)
	for _, date := range dates {
		_, hasFood := byDateType[fmt.Sprintf("%d:%s", date.Unix(), models.Food)]
		_, hasActivity := byDateType[fmt.Sprintf("%d:%s", date.Unix(), models.Activity)]
		missing := !hasFood || !hasActivity
		if missing || (staleFuture && date.After(today)) {
			targetDates = append(targetDates, date)
			continue
		}
	}
	if len(targetDates) == 0 {
		return filterPlanDates(existing, dateSet), nil
	}
	// If profile-dependent future entries are stale, regenerate the whole
	// future portion in one model request while preserving today and history.
	if staleFuture {
		targetDates = targetDates[:0]
		for _, date := range dates {
			if date.After(today) {
				targetDates = append(targetDates, date)
			}
		}
	}
	generated, err := h.generatePlan(ctx, user, timezone, localNow, targetDates)
	if err != nil {
		return nil, err
	}
	for i := range generated {
		generated[i].ProfileHash = hash
	}
	if err := h.planUC.Add(ctx, generated); err != nil {
		return nil, err
	}
	// Return the full requested horizon after the upsert.
	updated, err := h.planUC.GetByStartTimeAndFinishTime(ctx, dates[0].Unix(), dates[len(dates)-1].AddDate(0, 0, 1).Unix(), user.Utgid)
	if err != nil {
		return nil, err
	}
	return filterPlanDates(updated, dateSet), nil
}

func hasStaleFuturePlans(plans []models.Plan, dateSet map[int64]bool, today int64, profileHash string) bool {
	for _, plan := range plans {
		if dateSet[plan.Date] && plan.Date > today && plan.ProfileHash != profileHash {
			return true
		}
	}
	return false
}

func planDates(now time.Time, location *time.Location) []time.Time {
	local := now.In(location)
	first := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, location)
	dates := make([]time.Time, planHorizonDays)
	for i := range dates {
		dates[i] = first.AddDate(0, 0, i)
	}
	return dates
}

func filterPlanDates(plans []models.Plan, dateSet map[int64]bool) []models.Plan {
	filtered := make([]models.Plan, 0, len(plans))
	for _, plan := range plans {
		if dateSet[plan.Date] {
			filtered = append(filtered, plan)
		}
	}
	return filtered
}

func profileHash(user models.User, localNow time.Time, timezone string) string {
	dob := time.Unix(user.DateofBirth, 0).In(localNow.Location())
	age := localNow.Year() - dob.Year()
	if localNow.Month() < dob.Month() || (localNow.Month() == dob.Month() && localNow.Day() < dob.Day()) {
		age--
	}
	encoded, _ := json.Marshal([]any{user.Gender, user.DateofBirth, age, user.Weight, user.Height, user.Goal, user.PhysicalActivity, timezone})
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}
