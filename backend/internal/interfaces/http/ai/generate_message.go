package ai

import (
	"encoding/json"
)

const ModelName = "z-ai/glm-5.3-flash"

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
