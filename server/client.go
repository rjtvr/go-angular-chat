package main

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/coder/websocket"
)

const (
	writeTimeout   = 10 * time.Second
	maxMessageSize = 4096 // bytes; bigger frames close the connection
	sendBuffer     = 16   // messages queued per client before it counts as slow
)

type Client struct {
	id   string
	hub  *Hub
	conn *websocket.Conn
	send chan []byte // buffered; the Hub writes, writePump reads
}

// incoming is what the browser sends: just the text.
// The server sets type, sender and time itself so clients can't fake them.
type incoming struct {
	Content string `json:"content"`
}

// readPump blocks until the browser disconnects.
func (c *Client) readPump(ctx context.Context) {
	defer func() { c.hub.unregister <- c }()
	c.conn.SetReadLimit(maxMessageSize)

	for {
		_, data, err := c.conn.Read(ctx)
		if err != nil {
			return // closed tab, network drop, or bad frame: this client is done
		}

		var in incoming
		if err := json.Unmarshal(data, &in); err != nil {
			continue // ignore malformed JSON
		}
		text := strings.TrimSpace(in.Content)
		if text == "" {
			continue
		}

		c.hub.broadcast <- Message{
			Type:    TypeChat,
			Sender:  c.id,
			Content: text,
			SentAt:  time.Now(),
		}
	}
}

// writePump runs in its own goroutine and is the only writer to conn.
func (c *Client) writePump(ctx context.Context) {
	defer c.conn.Close(websocket.StatusNormalClosure, "")

	for {
		select {
		case data, ok := <-c.send:
			if !ok {
				return // the Hub closed our channel
			}
			wctx, cancel := context.WithTimeout(ctx, writeTimeout)
			err := c.conn.Write(wctx, websocket.MessageText, data)
			cancel()
			if err != nil {
				return
			}
		case <-ctx.Done():
			return // the HTTP request ended
		}
	}
}
