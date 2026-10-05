package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/ai"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
	"github.com/isiyar/daily-energy/backend/pkg/validator"
)

const planHorizonDays = 7

type planGenerationInput struct {
	Gender           models.Gender           `json:"gender"`
	DateOfBirth      int64                   `json:"date_of_birth"`
	Age              int                     `json:"age"`
	WeightKg         int                     `json:"weight_kg"`
	HeightCm         int                     `json:"height_cm"`
	Goal             models.Goal             `json:"goal"`
	PhysicalActivity models.PhysicalActivity `json:"physical_activity"`
	Timezone         string                  `json:"timezone"`
	CurrentDate      string                  `json:"current_date"`
	Dates            []int64                 `json:"plan_dates"`
}

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
	urlID, err := strconv.ParseInt(c.Param("utgid"), 10, 64)
	if err != nil || urlID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid utgid in URL"})
		return 0, false
	}
	ctxID, exists := c.Get("utgid")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing utgid in context"})
		return 0, false
	}
	ctxString, ok := ctxID.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid utgid type in context"})
		return 0, false
	}
	authID, err := strconv.ParseInt(ctxString, 10, 64)
	if err != nil || authID != urlID {
		c.JSON(http.StatusForbidden, gin.H{"error": "utgid mismatch"})
		return 0, false
	}
	return urlID, true
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
	generated, err := h.generatePlan(user, timezone, localNow, targetDates)
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

func (h *PlanHandler) generatePlan(user models.User, timezone string, localNow time.Time, dates []time.Time) ([]models.Plan, error) {
	input := planGenerationInput{
		Gender: user.Gender, DateOfBirth: user.DateofBirth, WeightKg: user.Weight,
		HeightCm: user.Height, Goal: user.Goal, PhysicalActivity: user.PhysicalActivity,
		Timezone: timezone, CurrentDate: localNow.Format("2006-01-02"),
	}
	if dob := time.Unix(user.DateofBirth, 0).In(localNow.Location()); !dob.IsZero() {
		age := localNow.Year() - dob.Year()
		if localNow.Month() < dob.Month() || (localNow.Month() == dob.Month() && localNow.Day() < dob.Day()) {
			age--
		}
		input.Age = age
	}
	for _, date := range dates {
		input.Dates = append(input.Dates, date.Unix())
	}
	encoded, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}
	jsonData, err := ai.GenerateMessage(string(h.cnfg.PlanGenerator), string(encoded))
	if err != nil {
		return nil, err
	}
	request, err := ai.GenerateRequest(h.cnfg, jsonData)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 90 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("AI API returned status %d", response.StatusCode)
	}
	var aiResponse ai.APIResponse
	if err := ai.Deserialization(body, &aiResponse); err != nil {
		return nil, err
	}
	content := strings.TrimSpace(strings.Trim(aiResponse.Choices[0].Message.Content, "\""))
	var result dto.AIPlanContent
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("invalid AI plan JSON: %w", err)
	}
	expected := make(map[int64]bool, len(dates))
	for _, date := range dates {
		expected[date.Unix()] = true
	}
	if len(result.Nutrition) != len(expected) || len(result.Workouts) != len(expected) {
		return nil, fmt.Errorf("AI plan must contain nutrition and workouts for exactly %d dates", len(expected))
	}
	plans := make([]models.Plan, 0, len(expected)*2)
	for key, daily := range result.Nutrition {
		date, err := strconv.ParseInt(key, 10, 64)
		if err != nil || !expected[date] || daily.Calories <= 0 || len(daily.Recommendations) == 0 {
			return nil, fmt.Errorf("AI returned invalid nutrition plan for date %q", key)
		}
		plans = append(plans, models.Plan{Id: uuid.NewString(), Utgid: user.Utgid, Date: date, CaloriesToConsume: daily.Calories, Recommendation: strings.Join(daily.Recommendations, "\n"), Type: models.Food})
	}
	for key, daily := range result.Workouts {
		date, err := strconv.ParseInt(key, 10, 64)
		if err != nil || !expected[date] || daily.Calories < 0 || len(daily.Recommendations) == 0 {
			return nil, fmt.Errorf("AI returned invalid activity plan for date %q", key)
		}
		plans = append(plans, models.Plan{Id: uuid.NewString(), Utgid: user.Utgid, Date: date, CaloriesToBurn: daily.Calories, Recommendation: strings.Join(daily.Recommendations, "\n"), Type: models.Activity})
	}
	return plans, nil
}
