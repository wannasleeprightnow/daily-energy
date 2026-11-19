package utils

import (
	"github.com/gin-gonic/gin"
	"strconv"
)

func ParseUserID(c *gin.Context) (int64, error) {
	userIDString := c.Param("user_id")

	userID, err := strconv.ParseInt(userIDString, 10, 64)
	if err != nil {
		return 0, err
	}

	return userID, nil
}
