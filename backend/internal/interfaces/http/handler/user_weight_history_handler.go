package handler

import (
	"log"
	"net/http"
	"strconv"

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

	if _, err := h.userUC.Execute(c.Request.Context(), utgidInt); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	userWeightHistory, err := h.userWeightHistoryUC.GetUserWeightHistory(c.Request.Context(), utgidInt)
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

	if _, err := h.userUC.Execute(c.Request.Context(), utgidInt); err != nil {
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

	domainUserWeightHistory := req.ToUserWeightHistory(utgidInt)
	if err := h.userWeightHistoryUC.Add(c.Request.Context(), domainUserWeightHistory); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, dto.ToUserWeightHistoryResponse(domainUserWeightHistory))
}
