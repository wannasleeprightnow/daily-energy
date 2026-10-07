package ai

import (
	"bytes"
	"fmt"
	"net/http"

	"github.com/isiyar/daily-energy/backend/config"
)

func GenerateRequest(cfg config.Config, jsonData []byte) (*http.Request, error) {
	req, err := http.NewRequest(http.MethodPost, cfg.APIPath, bytes.NewReader(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", cfg.APIKey))
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}
