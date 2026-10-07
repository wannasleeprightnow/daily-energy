package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/internal/app/usecase"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/dto"
	"github.com/isiyar/daily-energy/backend/pkg/validator"
)

type UserWeightHistoryHandler struct {
	userUC              *usecase.UserUseCase
	userWeightHistoryUC *usecase.UserWeightHistoryUseCase
}

func NewUserWeightHistoryHandler(userUC *usecase.UserUseCase, userWeightHistoryUC *usecase.UserWeightHistoryUseCase) *UserWeightHistoryHandler {
	return &UserWeightHistoryHandler{
		userUC:              userUC,
		userWeightHistoryUC: userWeightHistoryUC,
	}
}

func (h *UserWeightHistoryHandler) GetUserWeightHistory(c *gin.Context) {
	utgid, ok := authenticatedUserID(c)
	if !ok {
		return
	}

	if _, err := h.userUC.Execute(c.Request.Context(), utgid); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	userWeightHistory, err := h.userWeightHistoryUC.GetUserWeightHistory(c.Request.Context(), utgid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	response := make([]dto.UserWeightHistoryResponse, len(userWeightHistory))
	for i, entry := range userWeightHistory {
		response[i] = dto.ToUserWeightHistoryResponse(entry)
	}

	c.JSON(http.StatusOK, response)
}

func (h *UserWeightHistoryHandler) CreateUserWeightHistory(c *gin.Context) {
	utgid, ok := authenticatedUserID(c)
	if !ok {
		return
	}

	if _, err := h.userUC.Execute(c.Request.Context(), utgid); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var req dto.UserWeightHistoryCreate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	if err := validator.Struct(req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "validation failed", "details": err.Error()})
		return
	}

	domainUserWeightHistory := req.ToUserWeightHistory(utgid)
	if err := h.userWeightHistoryUC.Add(c.Request.Context(), domainUserWeightHistory); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, dto.ToUserWeightHistoryResponse(domainUserWeightHistory))
}
