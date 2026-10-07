import { DayContent } from "../main/DayContent";

/** Future date plan (Figma `будущее питание` / `будущее активность`). */
export function PlanPage({ utgid }: { utgid: number }) {
  return <DayContent mode="plan" utgid={utgid} />;
}