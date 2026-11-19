package adapterModels

import "time"

type Account struct {
	ID           int64  `gorm:"primaryKey;autoIncrement"`
	Username     string `gorm:"uniqueIndex;not null;size:32"`
	PasswordHash string `gorm:"not null"`
	CreatedAt    time.Time
}

type AuthSession struct {
	ID               string `gorm:"primaryKey;size:64"`
	AccountID        int64  `gorm:"index;not null"`
	RefreshTokenHash string `gorm:"not null;uniqueIndex;size:64"`
	ExpiresAt        time.Time `gorm:"index;not null"`
	RevokedAt        *time.Time
}

type AccessToken struct {
	TokenHash string `gorm:"primaryKey;size:64"`
	SessionID string `gorm:"index;not null;size:64"`
	ExpiresAt time.Time `gorm:"index;not null"`
}
