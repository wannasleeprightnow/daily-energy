package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/api/openapi"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/handler"
	"gorm.io/gorm"
)

func RegisterRoutes(r gin.IRouter, h *handler.Handler, c config.Config, db *gorm.DB, chatConnections *handler.ChatConnections) {
	r.GET("/docs", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Daily Energy API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => SwaggerUIBundle({
      url: "/api/openapi.yml",
      dom_id: "#swagger-ui",
      deepLinking: true
    });
  </script>
</body>
</html>`))
	})
	r.GET("/openapi.yml", func(c *gin.Context) {
		data, err := openapi.Files.ReadFile("openapi.yml")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read API schema"})
			return
		}
		c.Data(http.StatusOK, "application/yaml; charset=utf-8", data)
	})
	r.GET("/ping", handler.PingHandler)
	auth := handler.NewAuthHandler(db, c.AllowOrigins, c.SecureCookies, chatConnections)
	authRoutes := r.Group("/auth")
	authRoutes.Use(handler.AuthRateLimit())
	{
		authRoutes.POST("/register", auth.Register)
		authRoutes.POST("/login", auth.Login)
		authRoutes.POST("/refresh", auth.Refresh)
		authRoutes.POST("/logout", auth.Logout)
	}
	protected := handler.AuthMiddleware(db)
	r.GET("/auth/me", protected, auth.Me)

	users := r.Group("/users", protected)
	{
		users.POST("", h.User.CreateUser)
		users.GET("/:user_id", h.User.GetUser)
		users.PUT("/:user_id", h.User.UpdateUser)
		users.DELETE("/:user_id", h.User.DeleteUser)

		usersUserID := users.Group("/:user_id")
		{
			usersUserID.POST("/actions", h.Action.CreateAction)
			usersUserID.GET("/actions", h.Action.GetActions)

			usersUserID.POST("/plans", h.Plan.CreatePlan)
			usersUserID.GET("/plans", h.Plan.GetPlans)

			usersUserID.GET("/weight-history", h.UserWeightHistory.GetUserWeightHistory)
			usersUserID.POST("/weight-history", h.UserWeightHistory.CreateUserWeightHistory)
		}
	}

	actions := r.Group("/actions", protected)
	{
		actions.GET("/:id", h.Action.GetAction)
	}

	ai := r.Group("/ai", protected)
	{
		ai.POST("/calories", h.Ai.CalculationCalories)
		ai.POST("/activity-calories", h.Ai.CalculationActivityCalories)
	}

	r.GET("/ws/chat", protected, h.Chat.HandleChat)
}
