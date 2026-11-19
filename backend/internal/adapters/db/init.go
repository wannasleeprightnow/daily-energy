package db

import (
	"fmt"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/adapters/adapterModels"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func InitDatabase(c config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s", c.DBHost, c.DBPort, c.DBUsername, c.DBPassword, c.DBName)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&adapterModels.User{}); err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(&adapterModels.Account{}, &adapterModels.AuthSession{}, &adapterModels.AccessToken{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(
		&adapterModels.Action{},
		&adapterModels.Plan{},
		&adapterModels.UserWeightHistory{},
	); err != nil {
		return nil, err
	}
	for _, stmt := range []string{
		`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_account') THEN ALTER TABLE users ADD CONSTRAINT fk_users_account FOREIGN KEY (user_id) REFERENCES accounts (id) ON DELETE CASCADE; END IF; END $$`,
		`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_auth_sessions_account') THEN ALTER TABLE auth_sessions ADD CONSTRAINT fk_auth_sessions_account FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE; END IF; END $$`,
	} {
		if err := db.Exec(stmt).Error; err != nil { return nil, err }
	}
	if err := db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_user_date_type ON plans (user_id, date, type)`).Error; err != nil {
		return nil, err
	}

	return db, nil
}
