package handler

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type ChatConnections struct {
	mu       sync.Mutex
	bySession map[string]map[*websocket.Conn]struct{}
}

func NewChatConnections() *ChatConnections {
	return &ChatConnections{bySession: make(map[string]map[*websocket.Conn]struct{})}
}

func (r *ChatConnections) Register(sessionID string, conn *websocket.Conn) func() {
	r.mu.Lock()
	if r.bySession[sessionID] == nil {
		r.bySession[sessionID] = make(map[*websocket.Conn]struct{})
	}
	r.bySession[sessionID][conn] = struct{}{}
	r.mu.Unlock()

	return func() {
		r.mu.Lock()
		delete(r.bySession[sessionID], conn)
		if len(r.bySession[sessionID]) == 0 {
			delete(r.bySession, sessionID)
		}
		r.mu.Unlock()
	}
}

func (r *ChatConnections) CloseSession(sessionID string) {
	r.mu.Lock()
	connections := r.bySession[sessionID]
	delete(r.bySession, sessionID)
	r.mu.Unlock()

	for conn := range connections {
		_ = conn.WriteControl(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "session ended"),
			time.Now().Add(time.Second),
		)
		_ = conn.Close()
	}
}
