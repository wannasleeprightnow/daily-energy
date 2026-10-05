package ai

import (
	"encoding/json"
	"errors"
	"fmt"
)

var ErrNoChoices = errors.New("No choices in AI response")

type providerErrorResponse struct {
	Error struct {
		Message string `json:"message"`
		Code    any    `json:"code"`
	} `json:"error"`
}

func Deserialization(bodyBytes []byte, dto *APIResponse) error {
	if err := json.Unmarshal(bodyBytes, dto); err != nil {
		return fmt.Errorf("failed to parse AI response: %w", err)
	}

	if len(dto.Choices) == 0 {
		var providerError providerErrorResponse
		if err := json.Unmarshal(bodyBytes, &providerError); err == nil && providerError.Error.Message != "" {
			if providerError.Error.Code != nil {
				return fmt.Errorf("AI provider error (%v): %s", providerError.Error.Code, providerError.Error.Message)
			}
			return fmt.Errorf("AI provider error: %s", providerError.Error.Message)
		}
		return ErrNoChoices
	}
	return nil
}
