import { DayContent } from "./DayContent";

/** Today's plan (Figma `сегодня питание` / `сегодня активность`). */
export function TodayPage({ user_id }: { user_id: number }) {
  return <DayContent mode="today" user_id={user_id} />;
}