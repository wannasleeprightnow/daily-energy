package handler

import (
	"encoding/json"
	"errors"
	"regexp"
	"strconv"
	"strings"
)

var (
	caloriesJSONPattern = regexp.MustCompile(`(?i)"?calories"?[ \t]*:[ \t]*([0-9]+([.,][0-9]+)?)`)
	calorieRangePattern = regexp.MustCompile(`(?i)([0-9]+([.,][0-9]+)?)[ \t]*[-–—][ \t]*([0-9]+([.,][0-9]+)?)[ \t]*(ккал|kcal)`)
	calorieValuePattern = regexp.MustCompile(`(?i)([0-9]+([.,][0-9]+)?)[ \t]*(ккал|kcal)`)
)

func parseCalories(content string) (float64, error) {
	content = strings.TrimSpace(content)
	if content == "" || content == "null" || content == `"null"` {
		return 0, errors.New("empty calorie estimate")
	}
	content = strings.Trim(content, "`*\" \n\r\t")

	if value, err := strconv.ParseFloat(strings.ReplaceAll(content, ",", "."), 64); err == nil {
		return value, nil
	}

	var payload struct {
		Calories *float64 `json:"calories"`
	}
	if json.Unmarshal([]byte(content), &payload) == nil && payload.Calories != nil {
		return *payload.Calories, nil
	}

	if match := caloriesJSONPattern.FindStringSubmatch(content); len(match) > 0 {
		return parseCalorieNumber(match[1])
	}

	// When the model ignores the format instruction and gives a range, use its
	// midpoint. Match kcal units so serving weights (for example, "200 g") are
	// not mistaken for the calorie value.
	if match := calorieRangePattern.FindStringSubmatch(content); len(match) > 0 {
		low, err := parseCalorieNumber(match[1])
		if err != nil {
			return 0, err
		}
		high, err := parseCalorieNumber(match[3])
		if err != nil {
			return 0, err
		}
		return (low + high) / 2, nil
	}

	if match := calorieValuePattern.FindStringSubmatch(content); len(match) > 0 {
		return parseCalorieNumber(match[1])
	}

	return 0, errors.New("no calorie number found in model response")
}

func parseCalorieNumber(value string) (float64, error) {
	return strconv.ParseFloat(strings.ReplaceAll(value, ",", "."), 64)
}
