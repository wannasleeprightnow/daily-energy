import { DayContent } from "../main/DayContent";

/** Future date plan (Figma `будущее питание` / `будущее активность`). */
export function PlanPage({ user_id }: { user_id: number }) {
  return <DayContent mode="plan" user_id={user_id} />;
}