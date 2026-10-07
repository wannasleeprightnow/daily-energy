package handler

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// userIDFromContext returns the authenticated Telegram user ID added by the
// authentication middleware, preserving the API's existing error responses.
func userIDFromContext(c *gin.Context) (int64, bool) {
	value, exists := c.Get("utgid")
	if !exists {
		log.Println("Missing utgid in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing utgid in context"})
		return 0, false
	}

	valueString, ok := value.(string)
	if !ok {
		log.Println("Invalid utgid type in context")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid utgid type in context"})
		return 0, false
	}

	userID, err := strconv.ParseInt(valueString, 10, 64)
	if err != nil {
		log.Printf("Invalid utgid format in context: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid utgid in context"})
		return 0, false
	}

	return userID, true
}

// authenticatedUserID checks that a request's URL user matches its Telegram
// identity before allowing access to user-scoped endpoints.
func authenticatedUserID(c *gin.Context) (int64, bool) {
	urlID, err := strconv.ParseInt(c.Param("utgid"), 10, 64)
	if err != nil {
		if c.Param("utgid") == "" {
			log.Println("Missing utgid in URL")
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing utgid in URL"})
		} else {
			log.Printf("Invalid utgid format in URL: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid utgid in URL"})
		}
		return 0, false
	}

	authenticatedID, ok := userIDFromContext(c)
	if !ok {
		return 0, false
	}
	if urlID != authenticatedID {
		log.Printf("Utgid mismatch: URL=%d, Context=%d", urlID, authenticatedID)
		c.JSON(http.StatusForbidden, gin.H{"error": "utgid mismatch"})
		return 0, false
	}

	return urlID, true
}
