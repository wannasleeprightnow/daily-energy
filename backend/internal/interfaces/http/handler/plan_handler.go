package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/app/usecase"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
	"github.com/isiyar/daily-energy/backend/pkg/utils"
	"log"
	"net/http"
	"strconv"
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
