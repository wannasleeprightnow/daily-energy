package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/isiyar/daily-energy/backend/internal/adapters/adapterModels"
	"gorm.io/gorm"
)

func AuthMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := ""
		if header := c.GetHeader("Authorization"); strings.HasPrefix(header, "Bearer ") { token = strings.TrimPrefix(header, "Bearer ") }
		if c.IsWebsocket() && token == "" {
			for _, protocol := range strings.Split(c.GetHeader("Sec-WebSocket-Protocol"), ",") {
				protocol = strings.TrimSpace(protocol)
				if strings.HasPrefix(protocol, "daily-energy-token.") { token = strings.TrimPrefix(protocol, "daily-energy-token."); break }
			}
		}
		if token == "" { c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"missing access token"}); return }
		var access adapterModels.AccessToken
		if err := db.WithContext(c.Request.Context()).Where("token_hash = ? AND expires_at > ?", tokenHash(token), time.Now().UTC()).First(&access).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"invalid access token"}); return
		}
		var session adapterModels.AuthSession
		if err := db.WithContext(c.Request.Context()).Where("id = ? AND revoked_at IS NULL AND expires_at > ?", access.SessionID, time.Now().UTC()).First(&session).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"invalid session"}); return
		}
		c.Set("user_id", strconv.FormatInt(session.AccountID, 10))
		c.Set("session_id", session.ID)
		c.Set("access_expires_at", access.ExpiresAt)
		c.Next()
	}
}
