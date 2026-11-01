package main

import (
	"log"
	"net/http"

	"github.com/coder/websocket"
	"github.com/google/uuid"
)

const addr = ":8080"

// Browsers on these origins may connect. Same-origin requests and
// non-browser tools (no Origin header) are always allowed.
var allowedOrigins = []string{"localhost:4200"}

func main() {
	hub := NewHub()
	go hub.Run()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /ws", func(w http.ResponseWriter, r *http.Request) {
		serveWS(hub, w, r)
	})
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	log.Printf("chat server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func serveWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: allowedOrigins,
	})
	if err != nil {
		log.Printf("accept: %v", err) // Accept already wrote the HTTP error
		return
	}

	client := &Client{
		id:   uuid.NewString()[:8], // short id is easier to read in the UI
		hub:  hub,
		conn: conn,
		send: make(chan []byte, sendBuffer),
	}
	hub.register <- client

	go client.writePump(r.Context())
	client.readPump(r.Context()) // blocks until the client leaves
}
