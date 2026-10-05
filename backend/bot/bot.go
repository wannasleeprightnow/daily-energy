package bot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/isiyar/daily-energy/backend/config"
	"io/ioutil"
	"net/http"
	"time"
)

var offset int

func getUpdates(c *config.Config) ([]Update, error) {
	resp, err := http.Get(fmt.Sprintf("%s/getUpdates?timeout=10&offset=%d", c.TelegramApiUrl, offset))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)

	var result struct {
		OK     bool     `json:"ok"`
		Result []Update `json:"result"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return result.Result, nil
}

func sendMessage(chatID int64, text string, c *config.Config) error {
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
	}
	data, _ := json.Marshal(payload)
	_, err := http.Post(fmt.Sprintf("%s/sendMessage", c.TelegramApiUrl), "application/json", bytes.NewReader(data))
	return err
}

func RunBot(c *config.Config) {
	for {
		updates, err := getUpdates(c)
		if err != nil {
			fmt.Println("Bot error:", err)
			time.Sleep(2 * time.Second)
			continue
		}
		for _, update := range updates {
			offset = update.UpdateID + 1
			err := sendMessage(update.Message.Chat.ID, "Привет! \nЭто тг-бот для входа в приложение Daily Energy. \n\nDaily Energy поможет тебе добиться желаемого результата в контроле веса и других физических показателей. \n\nЧтобы зайти в приложение, нажми <a href=\"https://t.me/latest_daily_energy_bot./DailyEnergy\">сюда</a> или на кнопку слева внизу чата", c)
			if err != nil {
				fmt.Println("Bot error:", err)
			}
		}
		time.Sleep(300 * time.Millisecond)
	}
}
