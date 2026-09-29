package config

import (
	"fmt"
	"os"
	"strconv"

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
	MockTelegramAuth bool   `mapstructure:"MOCK_TELEGRAM_AUTH"`
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

	err := viper.Unmarshal(&c)
	if err != nil {
		return c, fmt.Errorf("unable to decode into struct: %v", err)
	}
	if mockAuth, ok := os.LookupEnv("MOCK_TELEGRAM_AUTH"); ok {
		c.MockTelegramAuth, err = strconv.ParseBool(mockAuth)
		if err != nil {
			return c, fmt.Errorf("invalid MOCK_TELEGRAM_AUTH value: %v", err)
		}
	}
	if apiKey, ok := os.LookupEnv("API_KEY"); ok {
		c.ApiKey = apiKey
	}
	c.TelegramApiUrl = fmt.Sprintf("https://api.telegram.org/bot%s", c.TelegramBotToken)

	c.CaloriesAnalyzer = "You are an expert in the field of fitness, dieotology and healthy lifestyle. Answers in Russian. A person has contacted you for recommendations or an answer to a question on this topic. Answer politely and briefly."
	c.FoodToAnalyze = "Provide the number of calories in a standard serving of"
	c.PlanGenerator = "You are a professional sports nutritionist and fitness coach who creates personalized 7-day nutrition and workout plans.\n\nInput data is provided in the following format:\n\nGender (sex) – \"male\" or \"female\"\n\nDate of birth (birthdate) – format Unix timestamp (in seconds)\n\nWeight (weight) – in kilograms\n\nHeight (height) – in centimeters\n\nGoal (aim) – one of: \"lose_weight\", \"main_weight\", \"gain_weight\"\n\nPhysical activity (physical_activity) – one of: \"low\", \"medium\", \"high\"\n\nStart date (start_date) – Unix timestamp (in seconds) — the date from which the 7-day plan begins\n\nYour task is to:\n\nCalculate the user's daily calorie norm using the Mifflin-St Jeor equation:\n\nBMR = 10 × weight + 6.25 × height − 5 × age + 5 (for males)\n\nBMR = 10 × weight + 6.25 × height − 5 × age − 161 (for females)\n\nMultiply BMR by activity factor:\n\nlow: ×1.375\n\nmedium: ×1.55\n\nhigh: ×1.725\n\nAdjust for goal:\n\nlose_weight: −15% from maintenance\n\nmain_weight: no change\n\ngain_weight: +15% from maintenance\n\nGenerate a 7-day JSON plan starting from the provided start_date (and incrementing one day at a time — 86400 seconds) with:\n\n\"nutrition\": a dictionary of Unix timestamps (in seconds) as keys with:\n\ndaily calorie intake (rounded to an integer)\n\n2–3 short nutrition recommendations in Russian, aligned with the user’s profile and goal\n\n\"workouts\": a dictionary of Unix timestamps (in seconds) as keys with:\n\nestimated calories to burn\n\n2–3 workout recommendations in Russian, based on user’s fitness level and goal (e.g., type, duration, intensity)\n\nOutput strictly in the following JSON format:\n\njson\nКопировать\nРедактировать\n{\n\"nutrition\": {\n\"UNIX_TIMESTAMP\": {\n\"calories\": int,\n\"recommendations\": [\"string\", ...]\n},\n...\n},\n\"workouts\": {\n\"UNIX_TIMESTAMP\": {\n\"calories\": int,\n\"recommendations\": [\"string\", ...]\n},\n...\n}\n}\nAdditional requirements:\n\nPlan must cover 7 consecutive days starting from start_date\n\nAll numbers must be rounded to integers\n\nAll keys in the output JSON must be Unix timestamps (in seconds)\n\nAll recommendations must be written in Russian\n\nDo not include any explanations, headers, or extra text — output strictly valid JSON only"

	return c, nil
}
