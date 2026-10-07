# Production entry points for Daily Energy.

DC ?= sudo docker compose
CONFIGURE := ./scripts/configure.sh

.PHONY: help configure configure-prod up down stop logs restart ps build prod \
        build-frontend build-backend format

help:
	@echo "Daily Energy — production commands:"
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

up: build
	$(DC) up -d --remove-orphans

down:
	$(DC) down -v --remove-orphans

stop:
	$(DC) down --remove-orphans

logs:
	$(DC) logs -f

restart:
	$(DC) restart

ps:
	$(DC) ps

build: configure-prod
	$(DC) --parallel 1 build backend-prod
	$(DC) --parallel 1 build frontend-prod

prod: up

build-backend:
	docker build -t daily-energy-backend:local ./backend

build-frontend:
	docker build -t daily-energy-frontend:local ./frontend

format:
	gofmt -s -w $$(find backend -type f -name '*.go')
	cd frontend && npm run lint -- --fix
