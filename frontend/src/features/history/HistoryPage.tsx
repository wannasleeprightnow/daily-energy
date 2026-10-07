import { DayContent } from "../main/DayContent";

/** Past date history (Figma `питание прошлое` / `активность прошлое`). */
export function HistoryPage({ utgid }: { utgid: number }) {
  return <DayContent mode="history" utgid={utgid} />;
}