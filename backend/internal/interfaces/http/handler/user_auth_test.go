package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAuthenticatedUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name         string
		urlID        string
		contextID    any
		setContextID bool
		wantID       int64
		wantOK       bool
		wantStatus   int
	}{
		{name: "matching identity", urlID: "123", contextID: "123", setContextID: true, wantID: 123, wantOK: true, wantStatus: http.StatusOK},
		{name: "missing URL ID", contextID: "123", setContextID: true, wantStatus: http.StatusBadRequest},
		{name: "invalid URL ID", urlID: "invalid", contextID: "123", setContextID: true, wantStatus: http.StatusBadRequest},
		{name: "missing context identity", urlID: "123", wantStatus: http.StatusUnauthorized},
		{name: "invalid context identity type", urlID: "123", contextID: 123, setContextID: true, wantStatus: http.StatusInternalServerError},
		{name: "invalid context identity value", urlID: "123", contextID: "invalid", setContextID: true, wantStatus: http.StatusBadRequest},
		{name: "identity mismatch", urlID: "123", contextID: "456", setContextID: true, wantStatus: http.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(response)
			c.Request = httptest.NewRequest(http.MethodGet, "/users/"+tt.urlID, nil)
			c.Params = gin.Params{{Key: "utgid", Value: tt.urlID}}
			if tt.setContextID {
				c.Set("utgid", tt.contextID)
			}

			gotID, gotOK := authenticatedUserID(c)
			if gotID != tt.wantID || gotOK != tt.wantOK {
				t.Errorf("authenticatedUserID() = (%d, %t), want (%d, %t)", gotID, gotOK, tt.wantID, tt.wantOK)
			}
			if response.Code != tt.wantStatus {
				t.Errorf("response status = %d, want %d", response.Code, tt.wantStatus)
			}
		})
	}
}

func TestGetActionsStopsOnIdentityMismatch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(response)
	c.Request = httptest.NewRequest(http.MethodGet, "/users/123/actions", nil)
	c.Params = gin.Params{{Key: "utgid", Value: "123"}}
	c.Set("utgid", "456")

	(&ActionHandler{}).GetActions(c)

	if response.Code != http.StatusForbidden {
		t.Fatalf("response status = %d, want %d", response.Code, http.StatusForbidden)
	}
}
