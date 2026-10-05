package handler

import (
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/ai"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
)

type AiHandler struct {
	cnfg config.Config
}

func NewAiHandler(cnfg config.Config) *AiHandler {
	return &AiHandler{cnfg: cnfg}
}

func (h *AiHandler) CalculationCalories(c *gin.Context) {
	var req dto.CaloriesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	jsonData, err := ai.GenerateMessage(
		"Estimate calories for the specified food portion. Return only one integer: the total kilocalories for the stated portion. Do not include units, explanation, alternatives, ranges, or Markdown. If preparation is unspecified, assume the food is cooked with water.",
		fmt.Sprintf("%s %s", h.cnfg.FoodToAnalyze, req.Title),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encode request body"})
		return
	}
	h.writeCaloriesResponse(c, jsonData)
}

// CalculationActivityCalories estimates the burn for a named activity using
// the user's body measurements and an explicit activity duration.
func (h *AiHandler) CalculationActivityCalories(c *gin.Context) {
	var req dto.ActivityCaloriesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || len(req.Title) > 200 ||
		req.Weight < 30 || req.Weight > 300 ||
		req.Height < 100 || req.Height > 250 ||
		req.DateOfBirth <= 0 || req.DateOfBirth > time.Now().Unix() ||
		req.DurationMinutes < 1 || req.DurationMinutes > 600 ||
		(req.Gender != models.Male && req.Gender != models.Female) ||
		(req.PhysicalActivity != models.Low && req.PhysicalActivity != models.Medium && req.PhysicalActivity != models.High) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid activity calorie request"})
		return
	}

	dateOfBirth := time.Unix(req.DateOfBirth, 0).UTC()
	now := time.Now().UTC()
	age := now.Year() - dateOfBirth.Year()
	birthdayThisYear := time.Date(now.Year(), dateOfBirth.Month(), dateOfBirth.Day(), 0, 0, 0, 0, time.UTC)
	if now.Before(birthdayThisYear) {
		age--
	}
	if age < 10 || age > 120 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date_of_birth"})
		return
	}

	userPrompt := fmt.Sprintf(
		"Estimate calories burned for one activity session. Use the profile and duration below. Activity: %q. Duration: %d minutes. Weight: %d kg. Height: %d cm. Age: %d years. Gender: %s. Usual activity level: %s.",
		req.Title, req.DurationMinutes, req.Weight, req.Height, age, req.Gender, req.PhysicalActivity,
	)
	systemPrompt := "Estimate total energy expenditure for the described physical activity session in kilocalories. Choose a realistic intensity for the named activity and estimate with a standard MET-based method, taking body weight, age, height, and gender into account where relevant. Treat this as an approximate estimate, not a precise measurement. Return only one positive integer (kcal), with no units, explanation, alternatives, range, or Markdown."

	jsonData, err := ai.GenerateMessage(systemPrompt, userPrompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encode request body"})
		return
	}
	h.writeCaloriesResponse(c, jsonData)
}

func (h *AiHandler) writeCaloriesResponse(c *gin.Context, jsonData []byte) {
	req, err := ai.GenerateRequest(h.cnfg, jsonData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send request"})
		return
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}
	var aiResp ai.APIResponse
	if err := ai.Deserialization(bodyBytes, &aiResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI provider returned an error"})
		return
	}

	content := strings.TrimSpace(aiResp.Choices[0].Message.Content)
	if content == "null" || content == `"null"` {
		c.JSON(http.StatusOK, dto.CaloriesResponse{Calories: nil})
		return
	}
	calories, err := parseCalories(content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse calories", "content": content})
		return
	}
	caloriesRounded := int(math.Ceil(calories))
	c.JSON(http.StatusOK, dto.CaloriesResponse{Calories: &caloriesRounded})
}
