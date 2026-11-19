# Local and production entry points for Daily Energy.

DC ?= sudo docker compose
DC_LOCAL ?= docker compose --env-file .env.local -f docker-compose.local.yml
CONFIGURE := ./scripts/configure.sh

.PHONY: help configure configure-prod configure-local up up-local down down-local \
        stop logs logs-local restart ps ps-local build build-local prod \
        build-frontend build-backend format

help:
	@echo "Daily Energy commands:"
	@echo "  make configure-local Prepare .env.local for HTTP-only local deployment"
	@echo "  make up-local        Build and start the local stack (no certificate)"
	@echo "  make down-local      Stop the local stack and preserve its database"
	@echo "  make logs-local      Follow local stack logs"
	@echo "  make ps-local        Show local service status"
	@echo "  make configure-prod   Prepare .env from .env.example"
	@echo "  make up               Build images sequentially and start production"
	@echo "  make down             Stop the stack and remove database volumes"
	@echo "  make stop             Stop the stack and preserve database volumes"
	@echo "  make logs             Follow production logs"
	@echo "  make restart          Restart production services"
	@echo "  make ps               Show production service status"
	@echo "  make build            Build production images"
	@echo "  make format           Format Go and frontend source"

configure: configure-prod

configure-prod:
	$(CONFIGURE) prod

configure-local:
	$(CONFIGURE) local

up: build
	$(DC) up -d --remove-orphans

up-local: configure-local
	$(DC_LOCAL) up --build -d --remove-orphans

down:
	$(DC) down -v --remove-orphans

down-local:
	$(DC_LOCAL) down --remove-orphans

stop:
	$(DC) down --remove-orphans

logs:
	$(DC) logs -f

logs-local:
	$(DC_LOCAL) logs -f

restart:
	$(DC) restart

ps:
	$(DC) ps

ps-local:
	$(DC_LOCAL) ps

build: configure-prod
	$(DC) --parallel 1 build backend-prod
	$(DC) --parallel 1 build frontend-prod

build-local: configure-local
	$(DC_LOCAL) --parallel 1 build backend-local frontend-local

prod: up

build-backend:
	docker build -t daily-energy-backend:local ./backend

build-frontend:
	docker build -t daily-energy-frontend:local ./frontend

format:
	gofmt -s -w $$(find backend -type f -name '*.go')
	cd frontend && npm run lint -- --fix
