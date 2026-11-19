#!/usr/bin/env bash
# Prepare local or production environment files without overwriting settings.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
ENV_EXAMPLE="${ROOT_DIR}/.env.example"
LOCAL_ENV_FILE="${ROOT_DIR}/.env.local"
LOCAL_ENV_EXAMPLE="${ROOT_DIR}/.env.local.example"

usage() {
  printf 'Usage: %s [prod|local|--help]\n' "$0"
}

case "${1:-prod}" in
  prod|local) mode="$1" ;;
  -h|--help|help)
    usage
    exit 0
    ;;
  *)
    printf 'Unsupported environment profile: %s\n' "$1" >&2
    usage >&2
    exit 2
    ;;
esac

if [[ $# -gt 1 ]]; then
  printf 'Only one argument is supported.\n' >&2
  usage >&2
  exit 2
fi

if [[ "${mode}" == "local" ]]; then
  if [[ ! -f "${LOCAL_ENV_FILE}" ]]; then
    if [[ ! -f "${LOCAL_ENV_EXAMPLE}" ]]; then
      printf 'Missing local environment template: %s\n' "${LOCAL_ENV_EXAMPLE}" >&2
      exit 1
    fi
    cp "${LOCAL_ENV_EXAMPLE}" "${LOCAL_ENV_FILE}"
    printf 'Created %s. The HTTP-only local stack is isolated from production settings.\n' "${LOCAL_ENV_FILE}"
  else
    printf 'Keeping existing %s; settings were not changed.\n' "${LOCAL_ENV_FILE}"
  fi
  printf 'Start the local stack with: make up-local\n'
  exit 0
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  if [[ ! -f "${ENV_EXAMPLE}" ]]; then
    printf 'Missing environment template: %s\n' "${ENV_EXAMPLE}" >&2
    exit 1
  fi
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  printf 'Created %s from .env.example. Fill in production secrets before deployment.\n' "${ENV_FILE}"
else
  printf 'Keeping existing %s; secrets and settings were not changed.\n' "${ENV_FILE}"
fi

printf 'Production environment is ready. Start the stack with: make up\n'
