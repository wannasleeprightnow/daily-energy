import axios, { type AxiosInstance } from "axios";
import { API_URL } from "@/constants";

/**
 * Axios instance preconfigured with the backend base URL.
 *
 * Auth: the Telegram `initData` is sent as a header on every request
 * (matching the existing backend middleware). The value is read lazily so the
 * mock / real environments both work.
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

/** Extract a human-readable message from a failed request. */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; details?: string } | undefined;
    if (data?.error) return data.error;
    if (data?.details) return data.details;
    return err.message;
  }
  return err instanceof Error ? err.message : "Неизвестная ошибка";
}

export type { AxiosInstance } from "axios";