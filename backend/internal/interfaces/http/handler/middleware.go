package handler

import (
	"encoding/base64"
	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/pkg/validator"
	"log"
	"net/http"
	"strings"
)

func TelegramAuthMiddleware(botToken string, allowMock bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if allowMock {
			c.Set("utgid", "777000")
			c.Next()
			return
		}

		initData := c.GetHeader("initData")
		if initData == "" && c.IsWebsocket() {
			for _, protocol := range strings.Split(c.GetHeader("Sec-WebSocket-Protocol"), ",") {
				protocol = strings.TrimSpace(protocol)
				const prefix = "daily-energy-initdata."
				if strings.HasPrefix(protocol, prefix) {
					decoded, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(protocol, prefix))
					if err == nil {
						initData = string(decoded)
					}
					break
				}
			}
		}
		if initData == "" {
			log.Println("Missing initData header")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing initData"})
			return
		}

		utgid, err := validator.GetTelegramUserID(initData, botToken)
		if err != nil {
			log.Printf("Invalid initData: %v", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid initData"})
			return
		}

		c.Set("utgid", utgid)
		c.Next()
	}
}
