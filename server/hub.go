package main

import (
	"encoding/json"
	"log"
	"time"
)

type Hub struct {
	clients    map[*Client]bool // owned by Run(); never touch it elsewhere
	register   chan *Client
	unregister chan *Client
	broadcast  chan Message
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan Message),
	}
}

// Run is the Hub's event loop. Start it once with `go hub.Run()`.
func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.clients[c] = true
			log.Printf("%s joined (%d online)", c.id, len(h.clients))
			// Tell the new client who it is, then tell everyone else.
			c.send <- encode(Message{Type: TypeWelcome, Sender: c.id, SentAt: time.Now()})
			h.sendAll(systemMessage(c.id+" joined the chat"), c)

		case c := <-h.unregister:
			if _, ok := h.clients[c]; ok {
				h.remove(c)
				log.Printf("%s left (%d online)", c.id, len(h.clients))
				h.sendAll(systemMessage(c.id+" left the chat"), nil)
			}

		case msg := <-h.broadcast:
			h.sendAll(msg, nil)
		}
	}
}

// sendAll queues msg for every client except skip (nil = nobody skipped).
func (h *Hub) sendAll(msg Message, skip *Client) {
	data := encode(msg)
	for c := range h.clients {
		if c == skip {
			continue
		}
		select {
		case c.send <- data: // queued
		default:
			// The client's buffer is full: it is too slow or gone. Drop it
			// rather than let one bad connection block the whole chat.
			h.remove(c)
		}
	}
}

func (h *Hub) remove(c *Client) {
	delete(h.clients, c)
	close(c.send) // tells the client's writePump to stop
}

func encode(msg Message) []byte {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("encode: %v", err)
	}
	return data
}
