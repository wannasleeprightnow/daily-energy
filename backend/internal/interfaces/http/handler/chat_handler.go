package handler

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/isiyar/daily-energy/backend/config"
	"github.com/isiyar/daily-energy/backend/internal/interfaces/http/ai"
)

type ChatHandler struct {
	c config.Config
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

	client := &http.Client{}

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

			conversationHistory = append(conversationHistory, ai.Message{Role: "user", Content: userMessage})

			chatRequest := ai.ChatRequest{
				Model:    ai.ModelName,
				Messages: conversationHistory,
			}

			jsonData, err := json.Marshal(chatRequest)
			if err != nil {
				log.Printf("[chat/ai] request marshal failed: model=%s err=%v", ai.ModelName, err)
				conn.WriteMessage(websocket.TextMessage, []byte("Error processing your request"))
				continue
			}

			req, err := ai.GenerateRequest(h.c, jsonData)
			if err != nil {
				log.Printf("[chat/ai] request construction failed: model=%s err=%v", ai.ModelName, err)
				conn.WriteMessage(websocket.TextMessage, []byte("Error processing your request"))
				continue
			}

			resp, err := client.Do(req)
			if err != nil {
				log.Printf("[chat/ai] request failed: model=%s err=%v", ai.ModelName, err)
				conn.WriteMessage(websocket.TextMessage, []byte("Error processing your request"))
				continue
			}
			bodyBytes, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				log.Printf("[chat/ai] response body read failed: status=%d err=%v", resp.StatusCode, err)
				conn.WriteMessage(websocket.TextMessage, []byte("Error processing your request"))
				continue
			}
			if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
				log.Printf("[chat/ai] provider returned error: status=%d", resp.StatusCode)
				conn.WriteMessage(websocket.TextMessage, []byte("Error from AI service"))
				continue
			}

			var apiResponse ai.APIResponse
			err = ai.Deserialization(bodyBytes, &apiResponse)
			if err != nil {
				log.Printf("[chat/ai] response parse failed: %v", err)
				conn.WriteMessage(websocket.TextMessage, []byte("Error processing your request"))
				continue
			}
			if len(apiResponse.Choices) == 0 {
				log.Printf("[chat/ai] response has no choices")
				conn.WriteMessage(websocket.TextMessage, []byte("Error processing your request"))
				continue
			}

			aiMessage := apiResponse.Choices[0].Message.Content
			conversationHistory = append(conversationHistory, ai.Message{Role: "assistant", Content: aiMessage})

			err = conn.WriteMessage(websocket.TextMessage, []byte(aiMessage))
			if err != nil {
				log.Printf("[chat/ws] response write failed: %v", err)
				break
			}
		}
	}
}
