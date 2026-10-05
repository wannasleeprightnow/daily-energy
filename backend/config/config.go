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
	c.PlanGenerator = `Create a personalized nutrition and activity plan for every date in plan_dates. The input may contain fewer than seven dates when only future days are being regenerated. Input is JSON with gender (Male/Female), goal (LoseWeight/Maintain/GainMuscleMass), physical_activity (Low/Medium/High), age, weight_kg, height_cm, timezone, current_date, and plan_dates (local-midnight Unix timestamps). Use these exact values.

Estimate nutrition calories with Mifflin-St Jeor, activity factors 1.375/1.55/1.725, and a moderate goal adjustment (-15% / 0% / +10-15%). Avoid extreme targets. Activity calories are rough estimates; include recovery days and vary the plan.

Give useful guidance for the whole day, not a single dish or exercise. For nutrition, summarize the day's overall approach (for example, meal balance, protein/fiber, hydration, and portions) in 1–2 concise Russian sentences, at most 180 characters total. For activity, describe the day's workout or recovery plan, with duration and intensity where relevant, also in 1–2 concise sentences and at most 180 characters. Tailor advice to the user's goal and activity level, vary it across days, and avoid headings, long explanations, or repeated generic text.

Return only valid JSON. Both dictionaries must contain every plan_dates timestamp exactly once as a string key, and no other dates. Match this schema:
{"nutrition":{"UNIX_TIMESTAMP":{"calories":2000,"recommendations":["Короткий совет."]}},"workouts":{"UNIX_TIMESTAMP":{"calories":250,"recommendations":["Короткий совет."]}}}`

	return c, nil
}
