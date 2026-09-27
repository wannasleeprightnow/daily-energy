/** Human-readable labels for the enums used across the app. */

import type { Gender, Goal, PhysicalActivity } from "@/api/types";

export const GOAL_LABEL: Record<Goal, string> = {
  LoseWeight: "похудеть",
  Maintain: "поддерживать вес",
  GainMuscleMass: "набрать вес",
};

export const GENDER_LABEL: Record<Gender, string> = {
  Male: "мужской",
  Female: "женский",
};

export const ACTIVITY_LABEL: Record<PhysicalActivity, string> = {
  Low: "низкий",
  Medium: "средний",
  High: "высокий",
};

/** The month grid shown on the calendar screen (Fig. `календарик`). */
export const WEEKDAYS_RU: string[] = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Localize the gender label (m/f). */
export function genderLabel(g: Gender): string {
  return GENDER_LABEL[g];
}