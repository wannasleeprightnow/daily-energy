#!/usr/bin/env bash
#
# Daily Energy — interactive project configurator.
#
# Presents a menu with the available run modes and writes the corresponding
# `.env` file used by docker compose. Each mode maps to a set of compose
# profiles, so the Makefile can simply delegate to this script.
#
# Usage:
#   ./scripts/configure.sh            # interactive menu
#   ./scripts/configure.sh <mode>     # non-interactive (see MODES below)
#   ./scripts/configure.sh --help
#
# Modes:
#   prod   — production: postgres + backend + frontend + nginx        (profiles: prod)
#   dev    — backend only (infra + API)                               (profiles: dev)
#   fe     — frontend only, mocked Telegram, real API                 (profiles: dev-fe)
#   full   — backend + frontend, mocked Telegram                      (profiles: dev-full)
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
ENV_EXAMPLE="${ROOT_DIR}/example.env"
# Overlay describing the mode-specific keys. Kept separate so a re-run of the
# configurator never clobbers the base secrets in `.env`.
MODE_FILE="${ROOT_DIR}/.env.mode"

# ---------------------------------------------------------------------------
# Mode definitions
# ---------------------------------------------------------------------------
# Each mode is described by:
#   profiles  — docker compose profiles passed via --profile
#   services  — human readable service list for the summary
#   mock_tg   — value written to VITE_MOCK_TELEGRAM
#   api_url   — value written to VITE_API_URL (frontend base url)
#   backend   — whether the backend is expected to run
#   frontend  — whether the frontend is expected to run
ALL_MODES=(prod dev fe full)

describe_mode() {
	case "$1" in
		prod)
			MODE_TITLE="Продакшен (prod)"
			MODE_DESC="postgres + backend + frontend + nginx (HTTPS)"
			MODE_PROFILES="prod"
			MODE_SERVICES="postgres backend-prod frontend-prod nginx-prod"
			MODE_MOCK_TG="false"
			MODE_API_URL=""
			MODE_BACKEND="yes"
			MODE_FRONTEND="yes"
			;;
		dev)
			MODE_TITLE="Разработка — только бэкенд (dev)"
			MODE_DESC="postgres + backend + nginx, без фронтенда"
			MODE_PROFILES="dev"
			MODE_SERVICES="postgres backend-dev nginx-dev"
			MODE_MOCK_TG="true"
			MODE_API_URL=""
			MODE_BACKEND="yes"
			MODE_FRONTEND="no"
			;;
		fe)
			MODE_TITLE="Разработка — только фронтенд (dev-fe)"
			MODE_DESC="frontend с моком Telegram, ходит на реальный API"
			MODE_PROFILES="dev-fe"
			MODE_SERVICES="frontend-fe"
			MODE_MOCK_TG="true"
			MODE_API_URL=""
			MODE_BACKEND="no"
			MODE_FRONTEND="yes"
			;;
		full)
			MODE_TITLE="Разработка — бэкенд + фронтенд (dev-full)"
			MODE_DESC="postgres + backend + nginx + frontend с моком Telegram"
			MODE_PROFILES="dev-full"
			MODE_SERVICES="postgres backend-dev nginx-dev frontend-fe"
			MODE_MOCK_TG="true"
			MODE_API_URL=""
			MODE_BACKEND="yes"
			MODE_FRONTEND="yes"
			;;
		*)
			echo "Неизвестный режим: $1" >&2
			return 1
			;;
	esac
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
c_reset='\033[0m'
c_bold='\033[1m'
c_dim='\033[2m'
c_cyan='\033[36m'
c_green='\033[32m'
c_yellow='\033[33m'

print_banner() {
	printf "${c_cyan}${c_bold}Daily Energy — конфигурация окружения${c_reset}\n"
	printf "${c_dim}Каталог проекта: %s${c_reset}\n\n" "${ROOT_DIR}"
}

print_menu() {
	print_banner
	printf "Выберите режим запуска:\n\n"
	local i=1
	for m in "${ALL_MODES[@]}"; do
		describe_mode "${m}"
		printf "  ${c_bold}%d)${c_reset} ${c_green}%-4s${c_reset} %s\n" \
			"${i}" "${m}" "${MODE_TITLE}"
		printf "        ${c_dim}%s${c_reset}\n" "${MODE_DESC}"
		i=$((i + 1))
	done
	printf "  ${c_bold}q)${c_reset} выход\n\n"
}

# Ask a yes/no question. Uses `read` from the terminal; when stdin is not a
# TTY the default is returned so CI / piped usage never hangs.
prompt_yes_no() {
	local question="$1" default="$2" answer
	if [[ ! -t 0 ]]; then
		printf "%s" "${default}"
		return 0
	fi
	read -rp "${question} " answer
	answer="${answer:-${default}}"
	[[ "${answer}" =~ ^[YyДд] ]]
}

select_mode_interactive() {
	print_menu
	local choice
	while true; do
		if ! read -rp "Введите номер режима: " choice; then
			echo "Нет ввода — прерываю." >&2
			exit 1
		fi
		case "${choice}" in
			q|Q|й|Й) echo "Отменено."; exit 0 ;;
			1) SELECTED_MODE="prod" ; return 0 ;;
			2) SELECTED_MODE="dev"  ; return 0 ;;
			3) SELECTED_MODE="fe"   ; return 0 ;;
			4) SELECTED_MODE="full" ; return 0 ;;
			*) echo "Некорректный ввод, попробуйте снова." >&2 ;;
		esac
	done
}

usage() {
	print_menu
	printf "Также можно указать режим аргументом: %s <prod|dev|fe|full>\n" "$0"
}

# ---------------------------------------------------------------------------
# .env handling
# ---------------------------------------------------------------------------
# Set KEY=VALUE in a file, replacing the existing line or appending it.
set_env_var() {
	local file="$1" key="$2" value="$3"
	if [[ ! -f "${file}" ]]; then
		: > "${file}"
	fi
	if grep -qE "^[[:space:]]*${key}=" "${file}"; then
		# `|` is used as the sed delimiter so URLs / paths stay intact.
		sed -i.bak -E "s|^[[:space:]]*${key}=.*|${key}=${value}|" "${file}"
		rm -f "${file}.bak"
	else
		printf '%s=%s\n' "${key}" "${value}" >> "${file}"
	fi
}

ensure_base_env() {
	if [[ -f "${ENV_FILE}" ]]; then
		return 0
	fi
	printf "${c_yellow}Файл .env не найден.${c_reset}\n"
	if [[ -f "${ENV_EXAMPLE}" ]]; then
		if prompt_yes_no "Создать .env из example.env? [Y/n]" "Y"; then
			cp "${ENV_EXAMPLE}" "${ENV_FILE}"
			printf "${c_green}Создан %s${c_reset}\n" "${ENV_FILE}"
			printf "${c_yellow}Заполните секреты (DB_*, TELEGRAM_BOT_TOKEN, API_KEY) перед запуском прод-режима.${c_reset}\n"
		else
			printf "${c_yellow}Создаю пустой .env.${c_reset}\n"
			: > "${ENV_FILE}"
		fi
	else
		: > "${ENV_FILE}"
	fi
}

write_mode_overlay() {
	# The overlay records the selected mode so the Makefile / compose can read
	# it without re-parsing the menu choice.
	cat > "${MODE_FILE}" <<EOF
# Generated by scripts/configure.sh — do not edit by hand.
MODE=${SELECTED_MODE}
COMPOSE_PROFILES=${MODE_PROFILES}
VITE_MOCK_TELEGRAM=${MODE_MOCK_TG}
VITE_API_URL=${MODE_API_URL}
EOF
}

sync_env() {
	local mode="$1"
	describe_mode "${mode}"
	SELECTED_MODE="${mode}"

	ensure_base_env

	# The mode overlay is rewritten from scratch on every run.
	write_mode_overlay

	# Mirror the frontend flags into .env as well so `docker compose` and a
	# locally-run `npm run dev` (which reads .env via vite) agree.
	set_env_var "${ENV_FILE}" "VITE_MOCK_TELEGRAM" "${MODE_MOCK_TG}"
	set_env_var "${ENV_FILE}" "VITE_API_URL" "${MODE_API_URL}"

	printf "\n${c_green}${c_bold}Готово.${c_reset} Режим: ${c_bold}%s${c_reset}\n" "${mode}"
	printf "  Профили compose : %s\n" "${MODE_PROFILES}"
	printf "  Сервисы         : %s\n" "${MODE_SERVICES}"
	printf "  Мок Telegram    : %s\n" "${MODE_MOCK_TG}"
	printf "  Backend         : %s\n" "${MODE_BACKEND}"
	printf "  Frontend        : %s\n" "${MODE_FRONTEND}"
	printf "\nЗапуск: ${c_bold}make up${c_reset} (или make dev / make prod)\n"
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
main() {
	local arg="${1:-}"

	case "${arg}" in
		-h|--help|help) usage; exit 0 ;;
	esac

	if [[ -n "${arg}" ]]; then
		SELECTED_MODE="${arg}"
		describe_mode "${SELECTED_MODE}" || { usage; exit 1; }
	else
		select_mode_interactive
	fi

	sync_env "${SELECTED_MODE}"
}

main "$@"
