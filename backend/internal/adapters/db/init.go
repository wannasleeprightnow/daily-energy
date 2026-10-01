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

	if err := db.AutoMigrate(
		&adapterModels.Action{},
		&adapterModels.Plan{},
		&adapterModels.UserWeightHistory{},
	); err != nil {
		return nil, err
	}

	// AutoMigrate creates the associations with ON DELETE CASCADE for new
	// databases, but does not change the action of an existing foreign key.
	// Rebuild these constraints so existing databases get the same behavior.
	for _, stmt := range []string{
		`ALTER TABLE actions DROP CONSTRAINT IF EXISTS fk_users_actions`,
		`ALTER TABLE actions ADD CONSTRAINT fk_users_actions FOREIGN KEY (utgid) REFERENCES users (utgid) ON DELETE CASCADE`,
		`ALTER TABLE plans DROP CONSTRAINT IF EXISTS fk_users_plans`,
		`ALTER TABLE plans ADD CONSTRAINT fk_users_plans FOREIGN KEY (utgid) REFERENCES users (utgid) ON DELETE CASCADE`,
		`ALTER TABLE user_weight_histories DROP CONSTRAINT IF EXISTS fk_users_user_weight_history`,
		`ALTER TABLE user_weight_histories ADD CONSTRAINT fk_users_user_weight_history FOREIGN KEY (utgid) REFERENCES users (utgid) ON DELETE CASCADE`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			return nil, err
		}
	}

	return db, nil
}
