package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/ai"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
)

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

func (h *PlanHandler) generatePlan(ctx context.Context, user models.User, timezone string, localNow time.Time, dates []time.Time) ([]models.Plan, error) {
	for attempt := 1; attempt <= planGenerationAttempts; attempt++ {
		plans, err := h.generatePlanOnce(ctx, user, timezone, localNow, dates)
		if err == nil {
			return plans, nil
		}
		if !errors.Is(err, ai.ErrNoChoices) || attempt == planGenerationAttempts {
			return nil, err
		}
		// Some free AI providers occasionally return an empty choices array. Retry
		// once before surfacing the failure; no plan rows are written until a
		// complete response has been validated.
		timer := time.NewTimer(500 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil, ctx.Err()
		case <-timer.C:
		}
	}
	return nil, ai.ErrNoChoices
}

func (h *PlanHandler) generatePlanOnce(ctx context.Context, user models.User, timezone string, localNow time.Time, dates []time.Time) ([]models.Plan, error) {
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
	jsonData, err := ai.GenerateMessage(string(h.cnfg.PlanGenerator), string(encoded), 4096)
	if err != nil {
		return nil, err
	}
	request, err := ai.GenerateRequest(h.cnfg, jsonData)
	if err != nil {
		return nil, err
	}
	request = request.WithContext(ctx)
	client := &http.Client{Timeout: 150 * time.Second}
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
		return nil, fmt.Errorf("AI API returned status %d: %s", response.StatusCode, providerErrorMessage(body))
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

func providerErrorMessage(body []byte) string {
	var response struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &response); err == nil && response.Error.Message != "" {
		return response.Error.Message
	}
	return "unexpected response from provider"
}
