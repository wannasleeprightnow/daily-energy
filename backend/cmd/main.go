package main

import (
	"log"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/bot"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/adapters/db"
	"github.com/isiyar/daily-energy/backend/internal/adapters/http/router"
	"github.com/isiyar/daily-energy/backend/internal/adapters/repository"
	"github.com/isiyar/daily-energy/backend/internal/app/usecase"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/handler"
	"gorm.io/gorm"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	cfg, err := config.LoadConfig()
	if err != nil {
		return err
	}

	gin.SetMode(gin.ReleaseMode)

	dbConn, err := db.InitDatabase(cfg)
	if err != nil {
		return err
	}

	go bot.RunBot(&cfg)
	r := newRouter(cfg, dbConn)
	if err := r.Run(); err != nil {
		return err
	}
	return nil
}

func newRouter(cfg config.Config, dbConn *gorm.DB) *gin.Engine {
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
	planHandler := handler.NewPlanHandler(cfg, planUC, userUC)

	aiHandler := handler.NewAiHandler(cfg)
	chatHandler := handler.NewChatHandler(cfg)

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
		AllowOrigins:  allowedOrigins(cfg.AllowOrigins),
		AllowMethods:  []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:  []string{"Origin", "Content-Type", "Accept", "Authorization", "initdata"},
		ExposeHeaders: []string{"Content-Length"},
	}))

	apiGroup := r.Group("/api")
	router.RegisterRoutes(apiGroup, h, cfg)
	return r
}

func allowedOrigins(value string) []string {
	var origins []string
	for _, origin := range strings.Split(value, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}
