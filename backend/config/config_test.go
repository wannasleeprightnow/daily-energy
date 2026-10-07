package config

import "testing"

func TestLoadConfigDefaultsAndDerivesProductionValues(t *testing.T) {
	values := map[string]string{
		"DB_HOST":            "postgres",
		"DB_USERNAME":        "daily_energy",
		"DB_PASSWORD":        "secret",
		"DB_NAME":            "daily_energy",
		"TELEGRAM_BOT_TOKEN": "telegram-token",
		"MINI_APP_URL":       "https://app.example.com/",
	}

	config, err := loadConfig(func(key string) string { return values[key] })
	if err != nil {
		t.Fatal(err)
	}
	if config.DBPort != defaultDBPort {
		t.Errorf("DBPort = %d, want %d", config.DBPort, defaultDBPort)
	}
	if config.APIPath != defaultAPIPath {
		t.Errorf("APIPath = %q, want %q", config.APIPath, defaultAPIPath)
	}
	if config.AllowOrigins != "https://app.example.com" {
		t.Errorf("AllowOrigins = %q, want production origin", config.AllowOrigins)
	}
	if config.TelegramAPIURL != "https://api.telegram.org/bottelegram-token" {
		t.Errorf("TelegramAPIURL = %q", config.TelegramAPIURL)
	}
}

func TestLoadConfigRejectsMissingProductionCredentials(t *testing.T) {
	_, err := loadConfig(func(string) string { return "" })
	if err == nil {
		t.Fatal("expected missing production settings to fail")
	}
}

func TestLoadConfigRejectsInvalidDatabasePort(t *testing.T) {
	values := map[string]string{
		"DB_PORT": "not-a-port",
	}
	_, err := loadConfig(func(key string) string { return values[key] })
	if err == nil {
		t.Fatal("expected invalid DB_PORT to fail")
	}
}
