package main

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/bot"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/adapters/db"
	"github.com/isiyar/daily-energy/backend/internal/adapters/http/router"
	"github.com/isiyar/daily-energy/backend/internal/adapters/repository"
	"github.com/isiyar/daily-energy/backend/internal/app/usecase"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/handler"
	"log"
	"strings"
)

func main() {
	c, err := config.LoadConfig()
	if err != nil {
		log.Panicf("Failed to load config: %v", err)
	}

	if c.TelegramBotToken != "" {
		go bot.RunBot(&c)
	}

	if !c.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	dbConn, err := db.InitDatabase(c)
	if err != nil {
		log.Panicf("Failed to initialize database: %v", err)
	}

	userRepo := repository.NewUserRepository(dbConn)
	userUC := usecase.NewUserUseCase(userRepo)
	userHandler := handler.NewUserHandler(userUC)

	weightHistoryRepo := repository.NewUserWeightHistoryRepository(dbConn)
	weightHistoryUC := usecase.NewUserWeightHistoryUseCase(weightHistoryRepo)
	weightHistoryHandler := handler.NewUserWeightHistoryHandler(userUC, weightHistoryUC)

	actionRepo := repository.NewActionRepository(dbConn)
	actionUC := usecase.NewActionUseCase(actionRepo)
	actionHandler := handler.NewActionHandler(actionUC, userUC)

	planRepo := repository.NewPlanRepository(dbConn)
	planUC := usecase.NewPlanUseCase(planRepo)
	planHandler := handler.NewPlanHandler(c, planUC, userUC)

	aiHandler := handler.NewAiHandler(c)
	chatHandler := handler.NewChatHandler(c)

	h := handler.NewHandler(
		actionHandler,
		userHandler,
		weightHistoryHandler,
		planHandler,
		aiHandler,
		chatHandler,
	)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:  strings.Split(c.AllowOrigins, ","),
		AllowMethods:  []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:  []string{"Origin", "Content-Type", "Accept", "Authorization", "initdata"},
		ExposeHeaders: []string{"Content-Length"},
	}))

	apiGroup := r.Group("/api")
	router.RegisterRoutes(apiGroup, h, c)

	if err := r.Run(); err != nil {
		log.Panicf("Failed to start server: %v", err)
	}
}
