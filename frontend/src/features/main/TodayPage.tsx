import { DayContent } from "./DayContent";

/** Today's plan (Figma `сегодня питание` / `сегодня активность`). */
export function TodayPage({ utgid }: { utgid: number }) {
  return <DayContent utgid={utgid} mode="today" />;
}