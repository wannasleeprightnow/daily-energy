package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/isiyar/daily-energy/backend/internal/adapters/adapterModels"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	refreshCookie = "daily_energy_refresh"
	accessTTL     = 10 * time.Minute
	sessionTTL    = 30 * 24 * time.Hour
)

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_.-]{3,32}$`)

type rateWindow struct {
	started time.Time
	count   int
}

var authRateState = struct {
	sync.Mutex
	clients map[string]rateWindow
}{clients: make(map[string]rateWindow)}

// AuthRateLimit limits expensive credential operations by client IP.
func AuthRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		now := time.Now()
		ip := c.ClientIP()

		authRateState.Lock()
		window := authRateState.clients[ip]
		if now.Sub(window.started) >= time.Minute {
			window = rateWindow{started: now}
		}
		window.count++
		authRateState.clients[ip] = window
		if len(authRateState.clients) > 10000 {
			for key, value := range authRateState.clients {
				if now.Sub(value.started) >= time.Minute {
					delete(authRateState.clients, key)
				}
			}
		}
		authRateState.Unlock()

		if window.count > 10 {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many authentication attempts"})
			return
		}
		c.Next()
	}
}

type AuthHandler struct {
	db             *gorm.DB
	allowedOrigins string
	secureCookies  bool
	connections    *ChatConnections
}

type credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func NewAuthHandler(db *gorm.DB, allowedOrigins string, secureCookies bool, connections *ChatConnections) *AuthHandler {
	return &AuthHandler{db: db, allowedOrigins: allowedOrigins, secureCookies: secureCookies, connections: connections}
}

func (h *AuthHandler) Register(c *gin.Context) {
	if !h.checkOrigin(c) {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input credentials
	if err := c.ShouldBindJSON(&input); err != nil || !validCredentials(input) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username must be 3-32 letters, digits, ., _, or -; password must be 10-72 bytes"})
		return
	}
	input.Username = strings.ToLower(input.Username)
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "account creation failed"})
		return
	}
	account := adapterModels.Account{Username: input.Username, PasswordHash: string(hash)}
	if err := h.db.WithContext(c.Request.Context()).Create(&account).Error; err != nil {
		message := strings.ToLower(err.Error())
		if strings.Contains(message, "unique") || strings.Contains(message, "duplicate") {
			c.JSON(http.StatusConflict, gin.H{"error": "username already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "account creation failed"})
		return
	}
	h.issueSession(c, account)
}

func (h *AuthHandler) Login(c *gin.Context) {
	if !h.checkOrigin(c) {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input credentials
	if err := c.ShouldBindJSON(&input); err != nil || input.Username == "" || input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username and password are required"})
		return
	}
	var account adapterModels.Account
	err := h.db.WithContext(c.Request.Context()).Where("username = ?", strings.ToLower(input.Username)).First(&account).Error
	if errors.Is(err, gorm.ErrRecordNotFound) || err == nil && bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(input.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
		return
	}
	h.issueSession(c, account)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	if !h.checkOrigin(c) {
		return
	}
	refresh, err := c.Cookie(refreshCookie)
	if err != nil || refresh == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}
	newRefresh, err := randomToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session refresh failed"})
		return
	}
	newAccess, err := randomToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session refresh failed"})
		return
	}

	oldHash := tokenHash(refresh)
	now := time.Now().UTC()
	var accountID int64
	err = h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var session adapterModels.AuthSession
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > ?", oldHash, now).
			First(&session).Error; err != nil {
			return err
		}
		result := tx.Model(&session).
			Where("refresh_token_hash = ? AND revoked_at IS NULL", oldHash).
			Update("refresh_token_hash", tokenHash(newRefresh))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return gorm.ErrRecordNotFound
		}
		accountID = session.AccountID
		return tx.Create(&adapterModels.AccessToken{
			TokenHash: tokenHash(newAccess),
			SessionID: session.ID,
			ExpiresAt: now.Add(accessTTL),
		}).Error
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			h.clearRefreshCookie(c)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "session refresh failed"})
		}
		return
	}
	h.setRefreshCookie(c, newRefresh, int(sessionTTL.Seconds()))
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{
		"access_token": newAccess,
		"expires_in":   int(accessTTL.Seconds()),
		"account":      gin.H{"id": accountID},
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	if !h.checkOrigin(c) {
		return
	}
	var sessionID any
	if value, ok := c.Get("session_id"); ok {
		sessionID = value
	} else if header := c.GetHeader("Authorization"); strings.HasPrefix(header, "Bearer ") {
		var access adapterModels.AccessToken
		if err := h.db.WithContext(c.Request.Context()).Where("token_hash = ?", tokenHash(strings.TrimPrefix(header, "Bearer "))).First(&access).Error; err == nil {
			sessionID = access.SessionID
		}
	}
	if sessionID != nil {
		if err := h.revokeSession(c, sessionID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "session logout failed"})
			return
		}
		if id, ok := sessionID.(string); ok && h.connections != nil { h.connections.CloseSession(id) }
	} else if refresh, err := c.Cookie(refreshCookie); err == nil {
		var session adapterModels.AuthSession
		if err := h.db.WithContext(c.Request.Context()).Where("refresh_token_hash = ? AND revoked_at IS NULL", tokenHash(refresh)).First(&session).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "session logout failed"})
			return
		}
		if session.ID != "" {
			if err := h.revokeSession(c, session.ID); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "session logout failed"})
				return
			}
			if h.connections != nil { h.connections.CloseSession(session.ID) }
		}
	}
	h.clearRefreshCookie(c)
	c.Header("Cache-Control", "no-store")
	c.Status(http.StatusNoContent)
}

func (h *AuthHandler) revokeSession(c *gin.Context, sessionID any) error {
	return h.db.WithContext(c.Request.Context()).Model(&adapterModels.AuthSession{}).
		Where("id = ? AND revoked_at IS NULL", sessionID).
		Update("revoked_at", time.Now().UTC()).Error
}

func (h *AuthHandler) Me(c *gin.Context) {
	id, ok := userIDFromContext(c)
	if !ok {
		return
	}
	var account adapterModels.Account
	if err := h.db.WithContext(c.Request.Context()).First(&account, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load account"})
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"id": account.ID, "username": account.Username})
}

func (h *AuthHandler) issueSession(c *gin.Context, account adapterModels.Account) {
	refresh, err := randomToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session creation failed"})
		return
	}
	access, err := randomToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session creation failed"})
		return
	}
	now := time.Now().UTC()
	sessionID := uuid.NewString()
	err = h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&adapterModels.AuthSession{
			ID: sessionID, AccountID: account.ID, RefreshTokenHash: tokenHash(refresh), ExpiresAt: now.Add(sessionTTL),
		}).Error; err != nil {
			return err
		}
		return tx.Create(&adapterModels.AccessToken{
			TokenHash: tokenHash(access), SessionID: sessionID, ExpiresAt: now.Add(accessTTL),
		}).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session creation failed"})
		return
	}
	h.setRefreshCookie(c, refresh, int(sessionTTL.Seconds()))
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, gin.H{
		"access_token": access,
		"expires_in":   int(accessTTL.Seconds()),
		"account":      gin.H{"id": account.ID, "username": account.Username},
	})
}

func validCredentials(input credentials) bool {
	passwordLength := len([]byte(input.Password))
	return usernamePattern.MatchString(input.Username) && passwordLength >= 10 && passwordLength <= 72
}

func randomToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func tokenHash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func (h *AuthHandler) setRefreshCookie(c *gin.Context, value string, maxAge int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshCookie, value, maxAge, "/api/auth", "", h.secureCookies, true)
}

func (h *AuthHandler) clearRefreshCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshCookie, "", -1, "/api/auth", "", h.secureCookies, true)
}

func (h *AuthHandler) checkOrigin(c *gin.Context) bool {
	parsed, err := url.Parse(c.GetHeader("Origin"))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid origin"})
		return false
	}
	origin := parsed.Scheme + "://" + parsed.Host
	for _, allowed := range strings.Split(h.allowedOrigins, ",") {
		if strings.TrimSpace(allowed) == origin {
			return true
		}
	}
	if h.allowedOrigins == "" && origin == requestOrigin(c.Request) {
		return true
	}
	c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "origin not allowed"})
	return false
}

func requestOrigin(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
		scheme = "https"
	}
	return scheme + "://" + r.Host
}
