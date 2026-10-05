package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/ai"
)

type ChatHandler struct {
	c config.Config
}

type chatClientMessage struct {
	Type    string              `json:"type"`
	Message string              `json:"message"`
	Profile *chatProfileContext `json:"profile,omitempty"`
}

type chatProfileContext struct {
	Age              int    `json:"age"`
	Gender           string `json:"gender"`
	Height           int    `json:"height"`
	Weight           int    `json:"weight"`
	Goal             string `json:"goal"`
	PhysicalActivity string `json:"physical_activity"`
}

func NewChatHandler(c config.Config) *ChatHandler {
	return &ChatHandler{
		c: c,
	}
}

func (h *ChatHandler) HandleChat(c *gin.Context) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		// The browser requires the server to select one of the requested
		// subprotocols. The auth payload protocol is read by middleware; this
		// fixed protocol identifies the chat connection without echoing initData.
		Subprotocols: []string{"daily-energy-chat"},
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[chat/ws] handshake failed: %v", err)
		return
	}
	defer conn.Close()

	conversationHistory := []ai.Message{
		{Role: "system", Content: string(h.c.CaloriesAnalyzer)},
	}
	profileContextAdded := false

	client := &http.Client{Timeout: 60 * time.Second}

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[chat/ws] read failed: %v", err)
			}
			break
		}

		if messageType == websocket.TextMessage {
			userMessage := string(p)
			var clientMessage chatClientMessage
			if json.Unmarshal(p, &clientMessage) == nil && clientMessage.Type == "chat_message" {
				userMessage = strings.TrimSpace(clientMessage.Message)
				if userMessage == "" {
					continue
				}
				if !profileContextAdded && clientMessage.Profile != nil {
					if context := formatChatProfileContext(clientMessage.Profile); context != "" {
						conversationHistory = append(conversationHistory, ai.Message{Role: "system", Content: context})
						profileContextAdded = true
					}
				}
			}

			conversationHistory = append(conversationHistory, ai.Message{Role: "user", Content: userMessage})
			rollbackUserMessage := func() {
				conversationHistory = conversationHistory[:len(conversationHistory)-1]
			}

			chatRequest := ai.ChatRequest{
				Model:    ai.ModelName,
				Messages: conversationHistory,
			}

			jsonData, err := json.Marshal(chatRequest)
			if err != nil {
				log.Printf("[chat/ai] request marshal failed: model=%s err=%v", ai.ModelName, err)
				rollbackUserMessage()
				writeChatError(conn)
				continue
			}

			req, err := ai.GenerateRequest(h.c, jsonData)
			if err != nil {
				log.Printf("[chat/ai] request construction failed: model=%s err=%v", ai.ModelName, err)
				rollbackUserMessage()
				writeChatError(conn)
				continue
			}

			resp, err := client.Do(req)
			if err != nil {
				log.Printf("[chat/ai] request failed: model=%s err=%v", ai.ModelName, err)
				rollbackUserMessage()
				writeChatError(conn)
				continue
			}
			bodyBytes, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				log.Printf("[chat/ai] response body read failed: status=%d err=%v", resp.StatusCode, err)
				rollbackUserMessage()
				writeChatError(conn)
				continue
			}
			if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
				log.Printf("[chat/ai] provider returned error: status=%d", resp.StatusCode)
				rollbackUserMessage()
				writeChatError(conn)
				continue
			}

			var apiResponse ai.APIResponse
			err = ai.Deserialization(bodyBytes, &apiResponse)
			if err != nil {
				log.Printf("[chat/ai] response parse failed: %v", err)
				rollbackUserMessage()
				writeChatError(conn)
				continue
			}
			if len(apiResponse.Choices) == 0 {
				log.Printf("[chat/ai] response has no choices")
				rollbackUserMessage()
				writeChatError(conn)
				continue
			}

			aiMessage := strings.TrimSpace(apiResponse.Choices[0].Message.Content)
			if aiMessage == "" {
				log.Printf("[chat/ai] response message was empty")
				rollbackUserMessage()
				writeChatError(conn)
				continue
			}
			conversationHistory = append(conversationHistory, ai.Message{Role: "assistant", Content: aiMessage})

			err = conn.WriteMessage(websocket.TextMessage, []byte(aiMessage))
			if err != nil {
				log.Printf("[chat/ws] response write failed: %v", err)
				break
			}
		}
	}
}

func formatChatProfileContext(profile *chatProfileContext) string {
	if profile.Age < 1 || profile.Age > 120 || profile.Height < 100 || profile.Height > 250 || profile.Weight < 30 || profile.Weight > 300 {
		return ""
	}
	gender, ok := map[string]string{"Male": "мужской", "Female": "женский"}[profile.Gender]
	if !ok {
		return ""
	}
	goal, ok := map[string]string{
		"LoseWeight":     "снижение веса",
		"Maintain":       "поддержание веса",
		"GainMuscleMass": "набор мышечной массы",
	}[profile.Goal]
	if !ok {
		return ""
	}
	activity, ok := map[string]string{"Low": "низкий", "Medium": "средний", "High": "высокий"}[profile.PhysicalActivity]
	if !ok {
		return ""
	}

	return strings.Join([]string{
		"Просто отвечай пользователю на его сообщение. Данные ниже используй только как внутренний контекст для более точных ответов.",
		"Не упоминай наличие профиля и не перечисляй его данные; не используй фразы вроде «при твоих параметрах» или «с учётом твоего роста и веса». Озвучивай характеристики только по прямому запросу пользователя. Если пользователь просто здоровается, коротко поздоровайся в ответ и не добавляй рекомендации.",
		fmt.Sprintf("Возраст: %d лет; пол: %s; рост: %d см; вес: %d кг; цель: %s; обычный уровень физической активности: %s.", profile.Age, gender, profile.Height, profile.Weight, goal, activity),
	}, "\n")
}

func writeChatError(conn *websocket.Conn) {
	response, err := json.Marshal(struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}{
		Type:    "error",
		Message: "Не удалось получить ответ от Рафика. Попробуй ещё раз.",
	})
	if err != nil {
		log.Printf("[chat/ws] error response marshal failed: %v", err)
		return
	}
	if err := conn.WriteMessage(websocket.TextMessage, response); err != nil {
		log.Printf("[chat/ws] error response write failed: %v", err)
	}
}
