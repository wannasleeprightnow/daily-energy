package handler

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/app/usecase"
	"github.com/isiyar/daily-energy/backend/internal/domain/models"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/ai"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
	"github.com/isiyar/daily-energy/backend/pkg/utils"
	"github.com/isiyar/daily-energy/backend/pkg/validator"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
)

type PlanHandler struct {
	cnfg   config.Config
	planUC *usecase.PlanUseCase
	userUC *usecase.UserUseCase
}

func NewPlanHandler(cnfg config.Config, planUC *usecase.PlanUseCase, userUC *usecase.UserUseCase) *PlanHandler {
	return &PlanHandler{
		cnfg:   cnfg,
		planUC: planUC,
		userUC: userUC,
	}
}

func (h *PlanHandler) CreatePlan(c *gin.Context) {
	utgidParam := c.Param("utgid")
	if utgidParam == "" {
		log.Println("Missing utgid in URL")
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing utgid in URL"})
		return
	}

	utgidInt, err := strconv.ParseInt(utgidParam, 10, 64)
	if err != nil {
		log.Printf("Invalid utgid format in URL: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid utgid in URL"})
		return
	}

	utgidCtx, ok := c.Get("utgid")
	if !ok {
		log.Println("Missing utgid in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing utgid in context"})
		return
	}

	utgidCtxStr, ok := utgidCtx.(string)
	if !ok {
		log.Println("Invalid utgid type in context")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid utgid type in context"})
		return
	}

	utgidCtxInt, err := strconv.ParseInt(utgidCtxStr, 10, 64)
	if err != nil {
		log.Printf("Invalid utgid format in context: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid utgid in context"})
		return
	}

	if utgidInt != utgidCtxInt {
		log.Printf("Utgid mismatch: URL=%d, Context=%d", utgidInt, utgidCtxInt)
		c.JSON(http.StatusForbidden, gin.H{"error": "utgid mismatch"})
		return
	}

	user, err := h.userUC.Execute(c.Request.Context(), utgidInt)
	if err != nil {
		log.Printf("User not found for utgid=%d: %v", utgidInt, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var Preq dto.PlanRequest
	if err := c.ShouldBindJSON(&Preq); err != nil {
		log.Printf("Invalid request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	if err := validator.Struct(Preq); err != nil {
		log.Printf("Validation failed: %v", err)
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "validation failed", "details": err.Error()})
		return
	}

	log.Printf("Generating plan for user: Gender=%s, DateofBirth=%d, Weight=%d, Height=%d, Goal=%s, PhysicalActivity=%s, PlanDate=%d",
		user.Gender, user.DateofBirth, user.Weight, user.Height, user.Goal, user.PhysicalActivity, Preq.Date)

	jsonData, err := ai.GenerateMessage(
		string(h.cnfg.PlanGenerator),
		fmt.Sprintf("%s %d %d %d %s %s %d", user.Gender, user.DateofBirth, user.Weight, user.Height, user.Goal, user.PhysicalActivity, Preq.Date))
	if err != nil {
		log.Printf("Failed to encode request body: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode request body"})
		return
	}

	req, err := ai.GenerateRequest(h.cnfg, jsonData)
	if err != nil {
		log.Printf("Failed to create AI request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create AI request"})
		return
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to send AI request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send AI request"})
		return
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Failed to read AI response: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read AI response"})
		return
	}

	var aiResp ai.APIResponse
	if err := ai.Deserialization(bodyBytes, &aiResp); err != nil {
		log.Printf("Failed to deserialize AI response: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to deserialize AI response"})
		return
	}

	content := strings.TrimSpace(aiResp.Choices[0].Message.Content)

	content = strings.Trim(content, "\"")

	var planContent dto.AIPlanContent
	if err := json.Unmarshal([]byte(content), &planContent); err != nil {
		log.Printf("Failed to parse AI plan content: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse AI plan content", "details": err.Error()})
		return
	}

	var plans []models.Plan
	for dateStr, nutrition := range planContent.Nutrition {
		date, err := strconv.ParseInt(dateStr, 10, 64)
		if err != nil {
			log.Printf("Invalid date format in nutrition plan: %s, %v", dateStr, err)
			continue
		}

		plan := models.Plan{
			Id:                uuid.New().String(),
			Utgid:             utgidInt,
			Date:              date,
			CaloriesToConsume: nutrition.Calories,
			CaloriesToBurn:    0,
			Recommendation:    strings.Join(nutrition.Recommendations, "\n"),
			Type:              models.Food,
		}
		plans = append(plans, plan)
	}

	for dateStr, workout := range planContent.Workouts {
		date, err := strconv.ParseInt(dateStr, 10, 64)
		if err != nil {
			log.Printf("Invalid date format in workout plan: %s, %v", dateStr, err)
			continue
		}

		plan := models.Plan{
			Id:                uuid.New().String(),
			Utgid:             utgidInt,
			Date:              date,
			CaloriesToConsume: 0,
			CaloriesToBurn:    workout.Calories,
			Recommendation:    strings.Join(workout.Recommendations, "\n"),
			Type:              models.Activity,
		}
		plans = append(plans, plan)
	}

	if err := h.planUC.Add(c, plans); err != nil {
		log.Printf("Failed to add plans: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add plans", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, dto.ToPlansResponse(plans))
}

func (h *PlanHandler) GetPlans(c *gin.Context) {
	utgidParam := c.Param("utgid")
	if utgidParam == "" {
		log.Println("Missing utgid in URL")
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing utgid in URL"})
		return
	}

	utgidInt, err := strconv.ParseInt(utgidParam, 10, 64)
	if err != nil {
		log.Printf("Invalid utgid format in URL: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid utgid in URL"})
		return
	}

	utgidCtx, ok := c.Get("utgid")
	if !ok {
		log.Println("Missing utgid in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing utgid in context"})
		return
	}

	utgidCtxStr, ok := utgidCtx.(string)
	if !ok {
		log.Println("Invalid utgid type in context")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid utgid type in context"})
		return
	}

	utgidCtxInt, err := strconv.ParseInt(utgidCtxStr, 10, 64)
	if err != nil {
		log.Printf("Invalid utgid format in context: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid utgid in context"})
		return
	}

	if utgidInt != utgidCtxInt {
		log.Printf("Utgid mismatch: URL=%d, Context=%d", utgidInt, utgidCtxInt)
		c.JSON(http.StatusForbidden, gin.H{"error": "utgid mismatch"})
		return
	}

	_, err = h.userUC.Execute(c.Request.Context(), utgidInt)
	if err != nil {
		log.Printf("User not found for utgid=%d: %v", utgidInt, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	startInt, finishInt, err := utils.ParseStartFinish(c)
	if err != nil {
		log.Printf("Invalid start or finish time: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if startInt > finishInt {
		log.Println("Start time must be less than finish time")
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "start must be less than end"})
		return
	}

	t := c.Query("type")

	plans, err := h.planUC.GetByStartTimeAndFinishTimeAndType(c.Request.Context(), startInt, finishInt, utgidInt, t)
	if err != nil {
		log.Printf("Failed to get plans for utgid=%d: %v", utgidInt, err)
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ToPlansResponse(plans))
}
