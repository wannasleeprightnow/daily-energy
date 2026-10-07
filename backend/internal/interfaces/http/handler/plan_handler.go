package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/app/usecase"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
	"github.com/isiyar/daily-energy/backend/pkg/utils"
	"net/http"
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
	utgid, ok := authenticatedUserID(c)
	if !ok {
		return
	}

	_, err := h.userUC.Execute(c.Request.Context(), utgid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	startInt, finishInt, err := utils.ParseStartFinish(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if startInt > finishInt {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "start must be less than end"})
		return
	}

	t := c.Query("type")

	plans, err := h.planUC.GetByStartTimeAndFinishTimeAndType(c.Request.Context(), startInt, finishInt, utgid, t)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ToPlansResponse(plans))
}
