package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

type Prompt string

type Config struct {
	Debug            bool   `mapstructure:"DEBUG"`
	DBHost           string `mapstructure:"DB_HOST"`
	DBPort           int    `mapstructure:"DB_PORT"`
	DBUsername       string `mapstructure:"DB_USERNAME"`
	DBPassword       string `mapstructure:"DB_PASSWORD"`
	DBName           string `mapstructure:"DB_NAME"`
	TelegramBotToken string `mapstructure:"TELEGRAM_BOT_TOKEN"`
	MiniAppURL        string `mapstructure:"MINI_APP_URL"`
	ApiPath          string `mapstructure:"API_PATH"`
	ApiKey           string `mapstructure:"API_KEY"`
	AllowOrigins     string `mapstructure:"ALLOW_ORIGINS"`
	TelegramApiUrl   string
	CaloriesAnalyzer Prompt
	FoodToAnalyze    Prompt
	PlanGenerator    Prompt
}

func LoadConfig() (Config, error) {
	var c Config

	viper.AutomaticEnv()
	for _, key := range []string{
		"DEBUG", "DB_HOST", "DB_PORT", "DB_USERNAME", "DB_PASSWORD", "DB_NAME",
		"TELEGRAM_BOT_TOKEN", "MINI_APP_URL", "API_PATH", "API_KEY", "ALLOW_ORIGINS",
	} {
		if err := viper.BindEnv(key); err != nil {
			return c, fmt.Errorf("unable to bind %s: %w", key, err)
		}
	}

	err := viper.Unmarshal(&c)
	if err != nil {
		return c, fmt.Errorf("unable to decode into struct: %v", err)
	}
	if apiKey, ok := os.LookupEnv("API_KEY"); ok {
		c.ApiKey = apiKey
	}
	if miniAppURL, ok := os.LookupEnv("MINI_APP_URL"); ok {
		c.MiniAppURL = miniAppURL
	}
	c.TelegramApiUrl = fmt.Sprintf("https://api.telegram.org/bot%s", c.TelegramBotToken)

	c.CaloriesAnalyzer = "You are an expert in the field of fitness, dieotology and healthy lifestyle. Answers in Russian. A person has contacted you for recommendations or an answer to a question on this topic. Answer politely and briefly."
	c.FoodToAnalyze = "Provide the number of calories in a standard serving of"
	c.PlanGenerator = "Create a personalized nutrition and activity plan for every date in plan_dates. Input is JSON with gender, goal, physical_activity, age, weight_kg, height_cm, timezone, current_date, and plan_dates. Use these exact values.\n\n" +
	"Estimate calories with Mifflin-St Jeor, activity factors 1.375/1.55/1.725, and moderate goal adjustment (-15% / 0% / +10-15%). Avoid extreme targets. Include recovery days and vary the plan.\n\n" +
	"Nutrition: 1–2 concise Russian sentences, max 180 characters. Activity: 1–2 concise Russian sentences, max 180 characters. Tailor to goal and activity level. No headings or generic repetition.\n\n" +
	"Return ONLY raw valid JSON. Do not use Markdown or code fences. Never use the ` character. The first character must be { and the last must be }. Both dictionaries must contain every plan_dates timestamp exactly once and no other dates.\n\n" +
	"Schema:\n" +
	"{\"nutrition\":{\"UNIX_TIMESTAMP\":{\"calories\":2000,\"recommendations\":[\"Короткий совет.\"]}},\"workouts\":{\"UNIX_TIMESTAMP\":{\"calories\":250,\"recommendations\":[\"Короткий совет.\"]}}}"

	return c, nil
}
