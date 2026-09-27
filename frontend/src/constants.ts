/**
 * Global app constants.
 */

/** Backend base URL (see also example.env / openapi.yml servers block). */
export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "https://test-srvr.ru";

export const MONTHS_RU: string[] = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export const APP_VERSION = "2.0.0";

/** Hard caps for onboarding numeric fields (Figma/API constraints). */
export const LIMITS = {
  weight: { min: 25, max: 250 },
  height: { min: 90, max: 250 },
} as const;