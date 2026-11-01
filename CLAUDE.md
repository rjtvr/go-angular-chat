# go-angular-chat

Group chat: a Go server relays JSON over a WebSocket to an Angular client. A learning project; the build-along guide is `doc/Build a Real-Time Chat App with Go + Angular (2026 Edition).md`. Read it before changing architecture or adding an exercise from it.

- `server/`: Go (modules, `net/http` `ServeMux`, `coder/websocket`, `google/uuid`). Port 8080.
- `client/`: Angular (standalone components, signals, `@for`/`@if`, RxJS `webSocket()`). Port 4200.

Run: `go run .` in `server/`, `ng serve` in `client/`. Smoke-test the server alone with `npx wscat -c ws://localhost:8080/ws` and send `{"content":"hi"}`.

## Wire contract

`server/message.go` `Message` and `client/src/app/features/chat/chat.models.ts` `ChatMessage` are one contract. Change both in the same edit: field names, `type` values (`chat`, `system`, `welcome`), and the JSON tags.

The browser sends only `{content}`. The server sets `type`, `sender` and `sentAt`, so clients cannot spoof them. Keep it that way.

## Server (Go)

- The Hub is a single event loop. Only `Hub.Run()` touches `clients`; every other goroutine asks through the `register`, `unregister` and `broadcast` channels. No mutex.
- Each connection has two pumps: `readPump` (browser to Hub) and `writePump` (Hub to browser, the only writer to `conn`).
- The Hub closes `Client.send` to stop `writePump`. Close it only through `Hub.remove`, once per client.
- Hub sends to clients use `select` with `default`, so a slow client is dropped instead of blocking the chat.
- `readPump` runs in the HTTP handler so the request context lives as long as the connection.
- Origins are allowlisted in `allowedOrigins` (`main.go`). A new dev host needs an entry there.
- Count characters with `len([]rune(s))`, not `len(s)`.

## Client (Angular)

- Layout under `src/app/`: `features/<name>/` holds a feature's components, service, models and routes (lazy-loaded from `app.routes.ts`); `core/` holds app-wide singletons and config tokens; `shared/` holds reusable UI, pipes and utils used by 2+ features.
- The socket URL comes from the `WS_URL` token (`core/config/app-config.ts`), backed by `src/environments/`. Dev targets `ws://localhost:8080/ws`; production is same-origin. Tests override the token.
- `ChatService` owns the socket and exposes `messages`, `myId`, `status` as signals. Components read signals and hold no socket logic.
- Update signal arrays by new reference: `messages.update(l => [...l, msg])`. `push()` leaves the view stale.
- Use standalone components, `@for`/`@if`, and `inject()`. NgModules, `*ngFor` and `*ngIf` are out.

## Testing: red, green, refactor

Every feature and bug fix goes through the loop, one behaviour at a time:

1. **Red**: write one failing test first. Run it and watch it fail for the right reason (the missing behaviour, not a typo or import error). A test never seen red proves nothing.
2. **Green**: write the least code that passes. Run the whole suite.
3. **Refactor**: clean up with the suite green, then run it again. Behaviour stays fixed; no new tests or features during this step.

- Go: table-driven `_test.go` beside the code; the Hub and pumps are tested through `httptest.NewServer` plus `websocket.Dial`. Run `go test -race ./...`.
- Angular: Vitest `*.spec.ts` beside the file under test. Mock the `rxjs/webSocket` boundary and override `WS_URL`; never open a real socket. Run `ng test --watch=false`.
- A bug fix starts with a test that reproduces the bug (red).
- Test behaviour through public APIs (signals, channels, messages), not private methods.

## Conventions

- Verify cross-stack changes end to end: server up, two browser tabs on `http://localhost:4200`, message flows both ways.
- Keep dependencies at the guide's list unless a task needs more (SQLite exercise: `modernc.org/sqlite`, pure Go).

## Logging new fixes

When an error or issue comes up and gets fixed:

1. Do NOT edit FIXES.md directly.
2. Ask me: "Add this to FIXES.md?" with a draft entry (Error, Cause, Fix, Lesson). Keep it brief.
3. Only write it after I say yes.

## Commit conventions

Conventional Commits v1.0.0, enforced by commitlint via a husky `commit-msg` hook (`client/.husky/`, config in `client/commitlint.config.mjs`). New commits only; never rewrite history.

Format: `<type>[optional scope][!]: <description>`, then an optional body and optional footers, each separated by a blank line.

- Types: `feat` (MINOR), `fix` (PATCH), `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Scopes: `server`, `client`, `wire` (a `Message`/`ChatMessage` contract change), `deps`.
- Breaking changes: add `!` after the type/scope and/or a `BREAKING CHANGE: <details>` footer (MAJOR). A wire contract change that breaks either side is breaking.
- Description: imperative mood, lowercase, no trailing period, under 72 characters.
- Footers use `Token: value` or `Token #value` (e.g. `Refs: #123`); tokens use `-` instead of spaces, except `BREAKING CHANGE`.
- Do not commit or push unless asked.
