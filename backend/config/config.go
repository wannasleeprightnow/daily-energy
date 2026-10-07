package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

const (
	defaultDBPort  = 5432
	defaultAPIPath = "https://openrouter.ai/api/v1/chat/completions"
)

type Config struct {
	DBHost           string
	DBPort           int
	DBUsername       string
	DBPassword       string
	DBName           string
	TelegramBotToken string
	TelegramAPIURL   string
	MiniAppURL       string
	APIPath          string
	APIKey           string
	AllowOrigins     string
	CaloriesAnalyzer Prompt
	PlanGenerator    Prompt
}

// LoadConfig reads and validates the production environment configuration.
func LoadConfig() (Config, error) {
	return loadConfig(os.Getenv)
}

func loadConfig(getenv func(string) string) (Config, error) {
	port := defaultDBPort
	if value := strings.TrimSpace(getenv("DB_PORT")); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 1 || parsed > 65535 {
			return Config{}, fmt.Errorf("DB_PORT must be an integer between 1 and 65535")
		}
		port = parsed
	}

	config := Config{
		DBHost:           strings.TrimSpace(getenv("DB_HOST")),
		DBPort:           port,
		DBUsername:       strings.TrimSpace(getenv("DB_USERNAME")),
		DBPassword:       getenv("DB_PASSWORD"),
		DBName:           strings.TrimSpace(getenv("DB_NAME")),
		TelegramBotToken: strings.TrimSpace(getenv("TELEGRAM_BOT_TOKEN")),
		MiniAppURL:       strings.TrimSpace(getenv("MINI_APP_URL")),
		APIPath:          strings.TrimSpace(getenv("API_PATH")),
		APIKey:           strings.TrimSpace(getenv("API_KEY")),
		AllowOrigins:     strings.TrimSpace(getenv("ALLOW_ORIGINS")),
		CaloriesAnalyzer: caloriesAnalyzerPrompt,
		PlanGenerator:    planGeneratorPrompt,
	}

	if config.APIPath == "" {
		config.APIPath = defaultAPIPath
	}
	if config.AllowOrigins == "" && config.MiniAppURL != "" {
		origin, err := originFromURL(config.MiniAppURL)
		if err != nil {
			return Config{}, fmt.Errorf("MINI_APP_URL: %w", err)
		}
		config.AllowOrigins = origin
	}
	config.TelegramAPIURL = "https://api.telegram.org/bot" + config.TelegramBotToken

	for _, required := range []struct {
		name  string
		value string
	}{
		{name: "DB_HOST", value: config.DBHost},
		{name: "DB_USERNAME", value: config.DBUsername},
		{name: "DB_PASSWORD", value: config.DBPassword},
		{name: "DB_NAME", value: config.DBName},
		{name: "TELEGRAM_BOT_TOKEN", value: config.TelegramBotToken},
	} {
		if required.value == "" {
			return Config{}, fmt.Errorf("%s is required", required.name)
		}
	}

	return config, nil
}

func originFromURL(rawURL string) (string, error) {
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("must be an absolute URL with a scheme and host")
	}
	return parsed.Scheme + "://" + parsed.Host, nil
}
