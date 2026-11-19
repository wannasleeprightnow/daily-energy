---
name: Daily Energy dev
description: How to build, run and verify this project (Telegram Mini App - React/TS frontend, Go backend, PostgreSQL, Docker Compose)
---

## Stack

Frontend `./frontend` - React 18 + TS + Vite + Tailwind + TanStack Query. Backend `./backend` - Go, PostgreSQL. Telegram Mini App + bot (`backend/bot`).

## Run / stop the stack

- Modes: `make configure-dev` (backend + DB), `make configure-full` (+ frontend), `make configure-prod`. Mode is stored in `.env.mode`; then `make up | down | stop | logs | ps`.
- Dev DB: container `postgres-dev`, host port 5432, db/user/password `daily_energy` (see docker-compose.yml). Prod DB creds live in `.env` - never commit or print them.
- Backend API: http://localhost:8080/api, Swagger: http://localhost:8080/api/docs. Frontend (dev-full): http://localhost:5173.

## Verify changes

- Backend: `cd backend && go build ./... && go test ./...`
- Frontend: `cd frontend && npm run lint && npm run build`
- Format: `make format` (gofmt + prettier)

## Architecture (Go, keep dependencies pointing inward)

`internal/domain/models` + `internal/domain/ports` -> `internal/app/usecase` -> `internal/adapters/{repository,adapterModels}` -> `internal/interfaces/http/{dto,handler}` + `internal/adapters/http/router`. Wiring in `backend/cmd/main.go`.

## Gotchas

- API contract: `backend/api/openapi/openapi.yml` - update it together with handlers/DTOs.
- Auth: every user-scoped request validates real Telegram `initData` (`pkg/validator/initdata.go`); 401 in a plain browser is expected.
- AI model name is hardcoded in `backend/internal/interfaces/http/ai/generate_message.go`.
