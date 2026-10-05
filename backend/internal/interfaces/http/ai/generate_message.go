package ai

import (
	"encoding/json"
)

const ModelName = "nvidia/nemotron-3-super-120b-a12b:free"

func GenerateMessage(systemPrompt string, userPrompt string, maxTokens ...int) ([]byte, error) {
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
	if len(maxTokens) > 0 {
		requestBody.MaxTokens = maxTokens[0]
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}
	return jsonData, nil
}
