import type { ActionType } from "@/api/types";

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { m } from "framer-motion";

import {
  ActionList,
  AiAdviceCard,
  CardLoading,
  PlanLoading,
  ProgressRingBlock,
} from "./PlanContent";
import { AddEntrySheet } from "./AddEntrySheet";

import { springs } from "@/ui/motion";
import { useActions } from "@/hooks/useActions";
import { useIsEnsuringPlan, useIsRefreshingFuturePlan, usePlans } from "@/hooks/usePlans";
import { useUser } from "@/hooks/useUser";
import { getPlanProfileKey } from "@/lib/profile";
import calendarIcon from "@/assets/icons/calendar.svg";
import foodIcon from "@/assets/icons/food.svg";
import plusIcon from "@/assets/icons/plus.svg";
import runningIcon from "@/assets/icons/running.svg";
import {
  dayRange,
  formatDateWithMonth,
  formatShortDate,
  nowStartOfDay,
} from "@/lib/dates";


interface DayContentProps {
  utgid: number;
  /** How the header is labelled. */
  mode: "today" | "plan" | "history";
}

/**
 * The content body shared by the Today / Plan / History screens.
 * Handles the Food/Activity toggle, the progress ring, the AI advice and the
 * action list. Date anchoring:
 *  - today   -> start of today
 *  - plan    -> the day picked via the calendar
 *  - history -> the day picked via the calendar (or yesterday)
 */
export function DayContent({ utgid, mode }: DayContentProps) {
  const navigate = useNavigate();
  const { kind = "food" } = useParams();
  const [addOpen, setAddOpen] = useState(false);
  const activityType: ActionType = kind === "activity" ? "Activity" : "Food";

  // Allow a specific day to be picked from the calendar screen.
  const stored = readDayFromStorage(utgid);
  const anchor = useMemo(() => {
    const today = nowStartOfDay();

    if (mode === "today") return today;
    if (stored && stored.mode !== "today") return stored.date;
    if (mode === "history") {
      const d = new Date(today);

      d.setDate(d.getDate() - 1);

      return d;
    }
    const d = new Date(today);

    d.setDate(d.getDate() + 1);

    return d;
  }, [mode, stored, utgid]);

  const range = useMemo(() => dayRange(anchor), [anchor]);
  const { data: actions, isLoading: actionsLoading } = useActions(
    utgid,
    range,
    activityType,
  );
  const { data: plans, isLoading: plansLoading } = usePlans(
    utgid,
    range,
    activityType,
  );
  const isEnsuringPlan = useIsEnsuringPlan(utgid);
  const { data: user } = useUser(utgid);
  const profileKey = getPlanProfileKey(user);
  const isRefreshingForProfile = useIsRefreshingFuturePlan(utgid, profileKey);
  const today = nowStartOfDay();
  const lastPlanDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6);
  const isFuturePlanDay = anchor > today && anchor <= lastPlanDay;
  const showPlanLoading =
    plansLoading ||
    (!plans?.length && isEnsuringPlan) ||
    (isRefreshingForProfile && isFuturePlanDay);

  const target = plans?.[0]
    ? activityType === "Food"
      ? plans[0].calories_to_consume
      : plans[0].calories_to_burn
    : null;
  const consumed = (actions || []).reduce((s, a) => s + a.calories, 0);
  const remaining = target === null ? null : Math.max(0, target - consumed);
  const recommendation = plans?.[0]?.recommendation.trim();

  const isAnchorToday =
    anchor.getFullYear() === today.getFullYear() &&
    anchor.getMonth() === today.getMonth() &&
    anchor.getDate() === today.getDate();
  const title =
    mode === "today" || (mode === "plan" && isAnchorToday)
      ? "Сегодняшний план"
      : mode === "history"
        ? `История за ${formatShortDate(anchor.getTime() / 1000)}`
        : `План на ${formatShortDate(anchor.getTime() / 1000)}`;
  const isActivity = activityType === "Activity";

  return (
    <div className="flex min-h-full flex-col px-6 pt-5">
      <DayHeader
        kind={activityType}
        title={title}
        onCalendar={() => navigate("/calendar")}
        onKindChange={(k) =>
          navigate(`/${mode}/${k === "Food" ? "food" : "activity"}`, {
            replace: false,
          })
        }
      />

      <div className="mt-5 flex flex-1 flex-col gap-4 pb-24">
        <section className="rounded-card bg-[#272727] p-[14px]">
          {showPlanLoading ? (
            <PlanLoading />
          ) : (
            <>
              <div className="flex items-center justify-around gap-3">
                <img
                  alt=""
                  aria-hidden="true"
                  className={isActivity ? "h-[100px] w-[75px] object-contain" : "h-[100px] w-[67px] object-contain"}
                  src={isActivity ? runningIcon : foodIcon}
                />
                <ProgressRingBlock
                  showConsumedProgress
                  isLoading={false}
                  remaining={remaining}
                  size={150}
                  target={target}
                />
              </div>
              {recommendation && (
                <div className="mt-2">
                  <AiAdviceCard large>{recommendation}</AiAdviceCard>
                </div>
              )}
            </>
          )}
        </section>
        <section className="rounded-card bg-[#272727] p-[14px]">
          <HistorySection
            compact
            actions={actions}
            actionsLoading={actionsLoading}
            onAdd={() => setAddOpen(true)}
          />
        </section>
      </div>

      <AddEntrySheet
        date={anchor}
        open={addOpen}
        type={activityType}
        utgid={utgid}
        onCalendar={() => navigate("/calendar")}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}

function HistorySection({
  actions,
  actionsLoading,
  onAdd,
  compact = false,
}: {
  actions?: import("@/api/types").ActionResponse[];
  actionsLoading: boolean;
  onAdd: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "rounded-card bg-[#272727]"}>
      <div className={`flex items-center justify-between ${compact ? "px-0" : "px-4"} pt-1`}>
        <h2 className={compact ? "text-[24px] font-medium leading-8 text-[#858585]" : "text-body font-medium text-on/80"}>
          История
        </h2>
        <button
          aria-label="Добавить"
          className="flex h-10 w-10 items-center justify-center"
          type="button"
          onClick={onAdd}
        >
          <img alt="" aria-hidden="true" className={compact ? "h-[29px] w-[29px]" : "h-[22px] w-[22px]"} src={plusIcon} />
        </button>
      </div>
      <div
        aria-label={compact ? "История за день" : undefined}
        className={compact ? "activity-history-scroll max-h-[220px] overflow-y-auto overscroll-contain pr-2" : ""}
      >
        {actionsLoading ? (
          <CardLoading />
        ) : (
          <ActionList actions={actions} compact={compact} emptyLabel="Тут пока ничего:)" />
        )}
      </div>
    </div>
  );
}

function DayHeader({
  title,
  kind,
  onKindChange,
  onCalendar,
}: {
  title: string;
  kind: ActionType;
  onKindChange: (k: ActionType) => void;
  onCalendar: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h1 className="max-w-[260px] text-[32px] font-medium leading-[37px] text-on">
          {title}
        </h1>
        <button
          aria-label="Календарь"
          className="flex h-11 w-11 shrink-0 items-center justify-center"
          type="button"
          onClick={onCalendar}
        >
          <img alt="" aria-hidden="true" className="h-[36px] w-[36px]" src={calendarIcon} />
        </button>
      </div>
      <ToggleTabs value={kind} onChange={onKindChange} />
    </div>
  );
}

function ToggleTabs({
  value,
  onChange,
}: {
  value: ActionType;
  onChange: (k: ActionType) => void;
}) {
  const items: { value: ActionType; label: string }[] = [
    { value: "Activity", label: "Активность" },
    { value: "Food", label: "Питание" },
  ];

  return (
    <div className="inline-flex rounded-card bg-surface p-1">
      {items.map((it) => {
        const active = value === it.value;

        return (
          <button
            key={it.value}
            aria-pressed={active}
            className="relative min-h-11 rounded-card px-[18px] text-[18px] font-medium text-on"
            type="button"
            onClick={() => onChange(it.value)}
          >
            {/* Sliding active indicator: a single element moves between tabs
                via layoutId — transform-only, GPU-composited. */}
            {active && (
              <m.span
                aria-hidden
                className="absolute inset-0 rounded-card bg-[#303030] ring-1 ring-[#a35b22] shadow-[0_0_5px_rgba(240,134,41,0.7)]"
                layoutId="day-tabs-indicator"
                transition={springs.snappy}
              />
            )}
            <span className="relative">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface StoredDay {
  date: Date;
  mode: string;
}

function readDayFromStorage(utgid: number): StoredDay | null {
  try {
    const raw = window.localStorage.getItem(`daily-energy:day:${utgid}`);

    if (!raw) return null;
    const { timestamp, mode } = JSON.parse(raw) as {
      timestamp: number;
      mode: string;
    };

    return { date: new Date(timestamp * 1000), mode };
  } catch {
    return null;
  }
}

/** Store the date picked on the calendar screen so Today/Plan/History honour it. */
export function writeDayPick(
  utgid: number,
  date: Date,
  mode: "today" | "plan" | "history",
): void {
  try {
    window.localStorage.setItem(
      `daily-energy:day:${utgid}`,
      JSON.stringify({ timestamp: Math.floor(date.getTime() / 1000), mode }),
    );
  } catch {
    /* storage unavailable — ignore */
  }
}

export { formatDateWithMonth };
