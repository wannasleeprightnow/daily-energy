import { DayContent } from "../main/DayContent";

/** Past date history (Figma `питание прошлое` / `активность прошлое`). */
export function HistoryPage({ user_id }: { user_id: number }) {
  return <DayContent mode="history" user_id={user_id} />;
}