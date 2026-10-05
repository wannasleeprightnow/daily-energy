import type { ReactNode } from "react";
import { EmptyState, ProgressRing, Spinner } from "@/ui";
import type { ActionResponse } from "@/api/types";
import { formatClock } from "@/lib/dates";

/**
 * Shared content building blocks for the Today / Plan / History screens
 * captured from the Figma `сегодня питание` / `будущее питание` frames.
 */

const CARD_BG = "#272727";

/** One horizontal action/food row — 292×40 r15 `#383838`. */
export function ActionRow({ action }: { action: ActionResponse }) {
  return (
    <li className="flex min-h-[40px] w-full items-center gap-3 rounded-card bg-[#383838] px-4 py-2">
      <span className="w-[52px] shrink-0 text-bodySm text-on/80 tabular-nums">
        {formatClock(action.date)}
      </span>
      <span className="flex-1 truncate text-bodySm text-on">
        {action.activity_name}
      </span>
      <span className="shrink-0 text-bodySm text-on/80 tabular-nums">
        {action.calories} ккал
      </span>
    </li>
  );
}

/** The action/food history list inside the content card. */
export function ActionList({
  actions,
  emptyLabel,
}: {
  actions?: ActionResponse[];
  emptyLabel: string;
}) {
  if (!actions?.length) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }
  return (
    <ul className="flex flex-col gap-2 p-4">
      {actions.map((a) => (
        <ActionRow key={a.id} action={a} />
      ))}
    </ul>
  );
}

/** Semicircular progress + "N kcal remaining" label. */
export function ProgressRingBlock({
  remaining,
  target,
  isLoading,
}: {
  remaining: number | null;
  target: number | null;
  isLoading: boolean;
}) {
  const progress =
    remaining === null || !target
      ? 0
      : Math.max(0, Math.min(1, remaining / target));
  return (
    <ProgressRing progress={progress} size={126} thickness={6}>
      <span className="text-center text-[15px] leading-[19px] text-on/90">
        {isLoading ? (
          "Загрузка…"
        ) : remaining === null ? (
          "План не создан"
        ) : (
          <>
            {remaining} kcal
            <br />
            remaining
          </>
        )}
      </span>
    </ProgressRing>
  );
}

/** The "Совет от ИИ-помощника" card — 292×118 r15 `#d9d9d9`. */
export function AiAdviceCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-1 rounded-card bg-[#d9d9d9] p-4 text-on">
      <span className="text-[13px] font-medium text-[#333]">
        Совет от ИИ-помощника:
      </span>
      <span className="text-[13px] leading-[17px] text-[#000]">{children}</span>
    </div>
  );
}

/** Loading slot inside the content card. */
export function CardLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size={24} />
    </div>
  );
}

/** Placeholder shown in the plan card until automatic generation completes. */
export function PlanLoading() {
  return (
    <div className="flex min-h-[150px] items-center justify-center gap-3 text-on/70" aria-live="polite">
      <Spinner size={28} />
      <span className="text-bodySm">Готовим план…</span>
    </div>
  );
}

export { CARD_BG };
