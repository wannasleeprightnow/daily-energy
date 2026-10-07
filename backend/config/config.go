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

	c.CaloriesAnalyzer = "Ты — Рафик, дружелюбный ИИ-помощник по фитнесу, питанию и здоровому образу жизни в приложении Daily Energy. " +
		"Отвечай на русском, кратко и по делу: 1–3 коротких абзаца, тёплый разговорный тон, без воды и канцелярита. " +
		"Давай практичные и безопасные рекомендации; больше одного уточняющего вопроса за раз не задавай. " +
		"Диагнозы не ставь: при признаках проблем со здоровьем советуй обратиться к врачу."
	c.PlanGenerator = "You are a nutritionist and fitness coach. Build a personalized daily nutrition and activity plan for every date in plan_dates.\n\n" +
		"Input JSON: gender, goal, physical_activity, age, weight_kg, height_cm, timezone, current_date, plan_dates. Use these exact values.\n\n" +
		"Calorie targets: Mifflin-St Jeor BMR, activity factor Low 1.375 / Medium 1.55 / High 1.725, then goal adjustment LoseWeight -15% / Maintain 0% / GainMuscleMass +10-15%. Avoid extreme targets. Include recovery days and vary the plan across dates.\n\n" +
		"For every date: nutrition.calories = daily kcal target; workouts.calories = kcal to burn that day. recommendations = 1-2 concrete Russian sentences, max 180 characters each, tailored to goal and activity level. No headings, no repetition across dates.\n\n" +
		"Output: ONLY raw valid JSON. No Markdown, no code fences, no backticks. First character must be { and last must be }. Both dictionaries must contain every plan_dates UNIX timestamp exactly once and no other dates.\n\n" +
		"Schema:\n" +
		"{\"nutrition\":{\"UNIX_TIMESTAMP\":{\"calories\":2000,\"recommendations\":[\"Короткий совет.\"]}},\"workouts\":{\"UNIX_TIMESTAMP\":{\"calories\":250,\"recommendations\":[\"Короткий совет.\"]}}}"

	return c, nil
}
