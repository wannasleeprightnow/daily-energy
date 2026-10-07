import axios, { type AxiosInstance } from "axios";

import { API_URL } from "@/constants";

/**
 * Axios instance preconfigured with the backend base URL.
 *
 * Auth: the Telegram `initData` is sent as a header on every request
 * (matching the backend middleware). The value is read lazily from Telegram.
 */
export const http: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Attach the current Telegram initData as the auth header. */
export function setAuthHeader(initData: string): void {
  http.defaults.headers.common["initData"] = initData;
}

/** Extract the raw technical message from a failed request (for debug blocks). */
export function apiErrorDetails(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; details?: string } | undefined;

    if (data?.error && data.details) return `${data.error}: ${data.details}`;
    if (data?.error) return data.error;
    if (data?.details) return data.details;

    return err.message;
  }

  return err instanceof Error ? err.message : "unknown error";
}

const AUTH_MESSAGE = "Не удалось подтвердить вход через Telegram. Открой мини-приложение заново.";
const NETWORK_MESSAGE = "Нет соединения с сервером. Проверь интернет и попробуй ещё раз.";
const AI_MESSAGE = "Рафик не смог сделать расчёт. Попробуй ещё раз.";

const AI_ERROR_PATTERNS = [
  "failed to parse calories",
  "ai provider",
  "no choices",
  "empty calorie",
  "failed to encode request body",
  "failed to create request",
  "failed to send request",
  "failed to read response",
];

const VALIDATION_ERROR_PATTERNS = [
  "invalid request",
  "invalid activity calorie request",
  "invalid date_of_birth",
  "validation",
];

function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

/**
 * Extract a human-readable (Russian) message from a failed request.
 * Raw technical text stays available via `apiErrorDetails` for debug blocks.
 */
export function apiErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    // Locally thrown errors may already carry a Russian user-facing message -
    // pass those through instead of masking them with a generic text.
    const message = err instanceof Error ? err.message : "";

    if (/[\u0400-\u04FF]/.test(message)) return message;

    return "Что-то пошло не так. Попробуй ещё раз.";
  }

  const status = err.response?.status ?? 0;
  const details = apiErrorDetails(err).toLowerCase();

  if (status === 401 || details.includes("initdata")) return AUTH_MESSAGE;
  if (matchesAny(details, AI_ERROR_PATTERNS)) return AI_MESSAGE;
  if (details.includes("timeout") || details.includes("timed out") || details.includes("network error")) {
    return NETWORK_MESSAGE;
  }
  if (matchesAny(details, VALIDATION_ERROR_PATTERNS)) {
    return "Проверь введённые данные и попробуй ещё раз.";
  }
  if (status === 429) return "Слишком много запросов. Попробуй ещё раз через пару минут.";
  if (status >= 500) return "Ошибка сервера. Попробуй ещё раз позже.";
  if (status >= 400) return "Запрос не прошёл. Попробуй ещё раз.";
  if (!err.response) return NETWORK_MESSAGE;

  return "Что-то пошло не так. Попробуй ещё раз.";
}

export type { AxiosInstance } from "axios";
