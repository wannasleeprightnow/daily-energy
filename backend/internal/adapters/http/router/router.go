package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/api/openapi"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/handler"
)

func RegisterRoutes(r gin.IRouter, h *handler.Handler, c config.Config) {
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
		c.Header("Content-Type", "application/yaml; charset=utf-8")
		c.Data(http.StatusOK, "application/yaml; charset=utf-8", mustReadOpenAPI())
	})
	r.GET("/ping", handler.PingHandler)

	users := r.Group("/users", handler.TelegramAuthMiddleware(c.TelegramBotToken, c.MockTelegramAuth))
	{
		users.POST("", h.User.CreateUser)
		users.GET("/:utgid", h.User.GetUser)
		users.PUT("/:utgid", h.User.UpdateUser)
		users.DELETE("/:utgid", h.User.DeleteUser)

		usersUtgid := users.Group("/:utgid")
		{
			usersUtgid.POST("/actions", h.Action.CreateAction)
			usersUtgid.GET("/actions", h.Action.GetActions)

			usersUtgid.POST("/plans", h.Plan.CreatePlan)
			usersUtgid.GET("/plans", h.Plan.GetPlans)

			usersUtgid.GET("/weight-history", h.UserWeightHistory.GetUserWeightHistory)
			usersUtgid.POST("/weight-history", h.UserWeightHistory.CreateUserWeightHistory)
		}
	}

	actions := r.Group("/actions", handler.TelegramAuthMiddleware(c.TelegramBotToken, c.MockTelegramAuth))
	{
		actions.GET("/:id", h.Action.GetAction)
	}

	ai := r.Group("/ai", handler.TelegramAuthMiddleware(c.TelegramBotToken, c.MockTelegramAuth))
	{
		ai.POST("/calories", h.Ai.CalculationCalories)
	}

	r.GET("/ws/chat", handler.TelegramAuthMiddleware(c.TelegramBotToken, c.MockTelegramAuth), h.Chat.HandleChat)
}

func mustReadOpenAPI() []byte {
	data, err := openapi.Files.ReadFile("openapi.yml")
	if err != nil {
		panic(err)
	}
	return data
}
