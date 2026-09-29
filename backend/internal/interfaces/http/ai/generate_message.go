package ai

import (
	"encoding/json"
)

const ModelName = "nvidia/nemotron-3-ultra-550b-a55b:free"

func GenerateMessage(systemPrompt string, userPrompt string) ([]byte, error) {
	requestBody := ChatRequest{
		Model: ModelName,
		Messages: []Message{
			{
				Role:    "system",
				Content: string(systemPrompt),
			},
			{
				Role:    "user",
				Content: userPrompt,
			},
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}
	return jsonData, nil
}
