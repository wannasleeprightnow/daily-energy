package bot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/isiyar/daily-energy/backend/config"
)

var offset int

func telegramRequest(c *config.Config, method string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	resp, err := http.Post(
		fmt.Sprintf("%s/%s", c.TelegramApiUrl, method),
		"application/json",
		bytes.NewReader(data),
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Telegram %s returned %s", method, resp.Status)
	}
	return nil
}

func getUpdates(c *config.Config) ([]Update, error) {
	resp, err := http.Get(fmt.Sprintf("%s/getUpdates?timeout=10&offset=%d", c.TelegramApiUrl, offset))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		OK     bool     `json:"ok"`
		Result []Update `json:"result"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return result.Result, nil
}

func RunBot(c *config.Config) {
	if strings.TrimSpace(c.MiniAppURL) != "" {
		if err := telegramRequest(c, "setChatMenuButton", map[string]interface{}{
			"menu_button": map[string]interface{}{
				"type": "web_app",
				"text": "Открыть Daily Energy",
				"web_app": map[string]string{"url": c.MiniAppURL},
			},
		}); err != nil {
			fmt.Println("Bot menu button error:", err)
		}
	}
	for {
		updates, err := getUpdates(c)
		if err != nil {
			fmt.Println("Bot error:", err)
			time.Sleep(2 * time.Second)
			continue
		}
		for _, update := range updates {
			offset = update.UpdateID + 1
			if update.Message == nil {
				continue
			}
			payload := map[string]interface{}{
				"chat_id": update.Message.Chat.ID,
				"text": "Привет! Daily Energy поможет отслеживать питание, активность и прогресс.",
			}
			if c.MiniAppURL != "" {
				payload["reply_markup"] = map[string]interface{}{
					"inline_keyboard": [][]map[string]interface{}{{
						{"text": "Открыть Daily Energy", "web_app": map[string]string{"url": c.MiniAppURL}},
					}},
				}
			}
			err := telegramRequest(c, "sendMessage", payload)
			if err != nil {
				fmt.Println("Bot error:", err)
			}
		}
		time.Sleep(300 * time.Millisecond)
	}
}
