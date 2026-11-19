package handler

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/internal/app/usecase"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
	"github.com/isiyar/daily-energy/backend/pkg/utils"
	"github.com/isiyar/daily-energy/backend/pkg/validator"
	"gorm.io/gorm"
)

type ActionHandler struct {
	actionUC *usecase.ActionUseCase
	userUC   *usecase.UserUseCase
}

func NewActionHandler(actionUC *usecase.ActionUseCase, userUC *usecase.UserUseCase) *ActionHandler {
	return &ActionHandler{
		actionUC: actionUC,
		userUC:   userUC,
	}
}

func (h *ActionHandler) CreateAction(c *gin.Context) {
	user_id, ok := authenticatedUserID(c)
	if !ok {
		return
	}

	if _, err := h.userUC.Execute(c.Request.Context(), user_id); errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var req dto.ActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	if err := validator.Struct(req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "validation failed", "details": err.Error()})
		return
	}

	domainAction := req.ToAction(user_id)
	if err := h.actionUC.Add(c.Request.Context(), &domainAction); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, dto.ToActionResponse(domainAction))
}

func (h *ActionHandler) GetAction(c *gin.Context) {
	user_id, ok := userIDFromContext(c)
	if !ok {
		return
	}

	id := c.Param("id")
	action, err := h.actionUC.Execute(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	if action.UserID != user_id {
		log.Printf("UserID mismatch: Action.UserID=%d, Context=%d", action.UserID, user_id)
		c.JSON(http.StatusForbidden, gin.H{"error": "user_id mismatch"})
		return
	}

	c.JSON(http.StatusOK, dto.ToActionResponse(action))
}

func (h *ActionHandler) GetActions(c *gin.Context) {
	user_id, ok := authenticatedUserID(c)
	if !ok {
		return
	}

	if _, err := h.userUC.Execute(c.Request.Context(), user_id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	startInt, finishInt, err := utils.ParseStartFinish(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err})
		return
	}

	if startInt > finishInt {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "start must be less than end"})
		return
	}

	t := c.Query("type")

	actions, err := h.actionUC.GetByStartTimeAndFinishTimeAndType(c.Request.Context(), startInt, finishInt, user_id, t)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dto.ToActionsResponse(actions))
}
