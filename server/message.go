package main

import "time"

type MessageType string

const (
	TypeChat    MessageType = "chat"    // a user message
	TypeSystem  MessageType = "system"  // Join and leave system message
	TypeWelcome MessageType = "welcome" // tells new client its own id with welcome message
)

type Message struct {
	Type    MessageType `json:"type"`
	Sender  string      `json:"sender,omitempty"`
	Content string      `json:"content"`
	SentAt  time.Time   `json:"sentAt"`
}

func systemMessage(content string) Message {
	return Message{
		Type:    TypeSystem,
		Content: content,
		SentAt:  time.Now(),
	}
}
