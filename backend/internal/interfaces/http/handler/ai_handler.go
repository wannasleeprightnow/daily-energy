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
	req.Title = strings.TrimSpace(req.Title)

	jsonData, err := ai.GenerateMessage(
		"Estimate the kilocalories in the stated food. If the portion is unspecified, assume one standard serving cooked in water. Reply with ONLY one positive integer - no units, words, ranges, or Markdown.",
		req.Title,
		32,
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
		"Estimate calories burned for one activity session. Activity: %q. Duration: %d minutes. Weight: %d kg. Height: %d cm. Age: %d years. Gender: %s. Usual activity level: %s.",
		req.Title, req.DurationMinutes, req.Weight, req.Height, age, req.Gender, req.PhysicalActivity,
	)
	systemPrompt := "Estimate kilocalories burned in the described activity session using a standard MET-based method with the provided weight, height, age, and gender; pick a realistic intensity for the named activity. Reply with ONLY one positive integer - no units, words, ranges, or Markdown."

	jsonData, err := ai.GenerateMessage(systemPrompt, userPrompt, 32)
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
