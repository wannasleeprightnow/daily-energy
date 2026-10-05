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
export function ActionRow({ action, compact = false }: { action: ActionResponse; compact?: boolean }) {
  return (
    <li className={`flex w-full items-center gap-3 rounded-card ${compact ? "min-h-[40px] bg-surface2 px-[14px] py-1.5" : "min-h-[40px] bg-[#383838] px-4 py-2"}`}>
      <span className={`${compact ? "w-[46px] text-[16px] leading-5" : "w-[52px] text-bodySm"} shrink-0 text-on/80 tabular-nums`}>
        {formatClock(action.date)}
      </span>
      <span className={`flex-1 truncate text-on ${compact ? "text-[16px] leading-5" : "text-bodySm"}`}>
        {action.activity_name}
      </span>
      <span className={`shrink-0 text-on/80 tabular-nums ${compact ? "text-[16px] leading-5" : "text-bodySm"}`}>
        {action.calories} ккал
      </span>
    </li>
  );
}

/** The action/food history list inside the content card. */
export function ActionList({
  actions,
  emptyLabel,
  compact = false,
}: {
  actions?: ActionResponse[];
  emptyLabel: string;
  compact?: boolean;
}) {
  if (!actions?.length) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }
  return (
    <ul className={`flex flex-col ${compact ? "gap-2 px-0 py-1.5" : "gap-2 p-4"}`}>
      {actions.map((a) => (
        <ActionRow key={a.id} action={a} compact={compact} />
      ))}
    </ul>
  );
}

/** Semicircular progress + "N kcal remaining" label. */
export function ProgressRingBlock({
  remaining,
  target,
  isLoading,
  size = 126,
  showConsumedProgress = false,
}: {
  remaining: number | null;
  target: number | null;
  isLoading: boolean;
  size?: number;
  showConsumedProgress?: boolean;
}) {
  const fraction = remaining === null || !target ? 0 : remaining / target;
  const progress = Math.max(0, Math.min(1, showConsumedProgress ? 1 - fraction : fraction));
  return (
    <ProgressRing progress={progress} size={size} thickness={6} lowerLabel={showConsumedProgress}>
      <span className={`text-center text-on/90 ${size < 120 ? "text-[13px] leading-[15px]" : size >= 130 ? "text-[18px] leading-[21px]" : "text-[15px] leading-[19px]"}`}>
        {isLoading ? (
          "Загрузка…"
        ) : remaining === null ? (
          "План не создан"
        ) : (
          <>
            {remaining} ккал
            <br />
            осталось
          </>
        )}
      </span>
    </ProgressRing>
  );
}

/** The "Совет от ИИ-помощника" card — 292×118 r15 `#d9d9d9`. */
export function AiAdviceCard({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return (
    <div className={`flex w-full min-w-0 flex-col gap-1 rounded-card bg-[#d9d9d9] text-on ${large ? "px-[13px] py-[12px]" : "p-4"}`}>
      <span className={`${large ? "text-[16px] leading-5" : "text-[13px]"} font-medium text-[#333]`}>
        Совет от ИИ-помощника:
      </span>
      <span className={`${large ? "text-[16px] leading-[21px]" : "text-[13px] leading-[17px]"} whitespace-pre-wrap break-words text-[#000]`}>{children}</span>
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
