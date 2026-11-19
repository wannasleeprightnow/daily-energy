package handler

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// userIDFromContext returns the authenticated account ID added by middleware.
func userIDFromContext(c *gin.Context) (int64, bool) {
	value, exists := c.Get("user_id")
	if !exists {
		log.Println("Missing user_id in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing user_id in context"})
		return 0, false
	}

	valueString, ok := value.(string)
	if !ok {
		log.Println("Invalid user_id type in context")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user_id type in context"})
		return 0, false
	}

	userID, err := strconv.ParseInt(valueString, 10, 64)
	if err != nil {
		log.Printf("Invalid user_id format in context: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id in context"})
		return 0, false
	}

	return userID, true
}

// authenticatedUserID checks URL ownership before allowing access to scoped endpoints.
func authenticatedUserID(c *gin.Context) (int64, bool) {
	urlID, err := strconv.ParseInt(c.Param("user_id"), 10, 64)
	if err != nil {
		if c.Param("user_id") == "" {
			log.Println("Missing user_id in URL")
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing user_id in URL"})
		} else {
			log.Printf("Invalid user_id format in URL: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id in URL"})
		}
		return 0, false
	}

	authenticatedID, ok := userIDFromContext(c)
	if !ok {
		return 0, false
	}
	if urlID != authenticatedID {
		log.Printf("UserID mismatch: URL=%d, Context=%d", urlID, authenticatedID)
		c.JSON(http.StatusForbidden, gin.H{"error": "user_id mismatch"})
		return 0, false
	}

	return urlID, true
}
