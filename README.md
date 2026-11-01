# go-angular-chat

A real-time group chat. A Go server relays JSON over a WebSocket to an Angular client: a message typed in one browser tab appears instantly in every other open tab.

This is a learning project, built along a 2026 rewrite of the 2016 Polyglot Developer Go + Angular chat tutorial.

## Stack

| Part | Tech | Port |
| --- | --- | --- |
| `server/` | Go, `net/http` `ServeMux`, [coder/websocket](https://github.com/coder/websocket), [google/uuid](https://github.com/google/uuid) | 8080 |
| `client/` | Angular (standalone components, signals, `@for` / `@if`), RxJS `webSocket()`, Vitest | 4200 |

## How it works

```
Browser tab ──readPump──▶ Hub ──▶ each client's send queue ──writePump──▶ Browser tabs
```

- The **Hub** is a single goroutine that owns the set of connected clients. Other goroutines talk to it through the `register`, `unregister` and `broadcast` channels, so no mutex is needed.
- Each connection has two pumps: `readPump` (browser to Hub) and `writePump` (Hub to browser, the only writer to the socket).
- A slow client is dropped instead of blocking the chat.
- Origins are allowlisted in `allowedOrigins` in `server/main.go`.
- On the client, `ChatService` owns the socket and exposes `messages`, `myId` and `status` as signals. It reconnects automatically if the server goes away.

## Prerequisites

- Go 1.22 or newer (method-based routes like `GET /ws`)
- Node.js 20 or newer and the Angular CLI (`npm install -g @angular/cli`)

## Run it

Start the server:

```bash
cd server
go run .
```

In a second terminal, start the client:

```bash
cd client
npm install
ng serve
```

Open <http://localhost:4200> in two tabs and send a message. The status pill turns green and shows `online as <your id>` once the socket connects.

To test the server alone, without the UI:

```bash
npx wscat -c ws://localhost:8080/ws
```

then send `{"content":"hi"}`.

## Project layout

```text
go-angular-chat/
├── server/                       # Go WebSocket server
│   ├── main.go                   # HTTP server and /ws handler
│   ├── hub.go                    # central goroutine that tracks clients
│   ├── client.go                 # per-connection read and write pumps
│   └── message.go                # the JSON message shape
└── client/                       # Angular app
    └── src/app/
        ├── core/config/          # WS_URL token, backed by src/environments/
        ├── features/chat/        # chat component, service, models, routes
        └── shared/               # reusable UI shared by 2+ features
```

## Wire contract

`Message` in `server/message.go` and `ChatMessage` in `client/src/app/features/chat/chat.models.ts` describe the same JSON and must change together.

| Field | Notes |
| --- | --- |
| `type` | `chat`, `system` or `welcome` |
| `sender` | Sender id, set by the server |
| `content` | The message text |
| `sentAt` | ISO 8601 timestamp, set by the server |

The browser sends only `{"content": "..."}`. The server sets `type`, `sender` and `sentAt`, so clients cannot spoof them.

## Tests

```bash
cd server && go test -race ./...
cd client && ng test --watch=false
```

New behaviour follows red, green, refactor: write one failing test first, then the least code that passes, then clean up.

## Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), checked by commitlint through a husky `commit-msg` hook. Running `npm install` in `client/` installs the hook.

```text
<type>[optional scope][!]: <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Suggested scopes: `server`, `client`, `wire`, `deps`.

## Practice exercises

The build-along guide ends with exercises that extend the app, such as showing the online count, choosing a display name, a typing indicator, message history, rooms, SQLite persistence, Hub tests, graceful shutdown, and shipping one binary with `embed.FS` and Docker.
