import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ActionType } from "@/api/types";
import { useActions } from "@/hooks/useActions";
import { usePlans } from "@/hooks/usePlans";
import {
  dayRange,
  formatDateWithMonth,
  formatShortDate,
  nowStartOfDay,
} from "@/lib/dates";
import {
  ActionList,
  AiAdviceCard,
  CardLoading,
  ProgressRingBlock,
} from "./PlanContent";
import { AddEntrySheet } from "./AddEntrySheet";

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

  const target = plans?.[0]
    ? activityType === "Food"
      ? plans[0].calories_to_consume
      : plans[0].calories_to_burn
    : null;
  const consumed = (actions || []).reduce((s, a) => s + a.calories, 0);
  const remaining = target === null ? null : Math.max(0, target - consumed);
  const recommendation = plans?.[0]?.recommendation.trim();

  const title =
    mode === "today"
      ? "Сегодняшний план"
      : mode === "history"
        ? `История за ${formatShortDate(anchor.getTime() / 1000)}`
        : `План на ${formatShortDate(anchor.getTime() / 1000)}`;

  return (
    <div className="flex min-h-full flex-col px-5 pt-5">
      <DayHeader
        title={title}
        kind={activityType}
        onKindChange={(k) =>
          navigate(`/${mode}/${k === "Food" ? "food" : "activity"}`, {
            replace: false,
          })
        }
        onCalendar={() => navigate("/calendar")}
      />

      <div className="mt-5 flex flex-1 flex-col gap-4">
        <div className="rounded-card bg-[#272727] p-4">
          <div className="flex items-center gap-4">
            <ProgressRingBlock
              remaining={remaining}
              target={target}
              isLoading={plansLoading}
            />
            <div className="flex-1">
              {recommendation && <AiAdviceCard>{recommendation}</AiAdviceCard>}
            </div>
          </div>
        </div>

        <div className="rounded-card bg-[#272727]">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-body font-medium text-on/80">История</h2>
            <button
              type="button"
              aria-label="Добавить"
              onClick={() => setAddOpen(true)}
              className="flex h-11 w-11 items-center justify-center"
            >
              <AddGlyph />
            </button>
          </div>
          {actionsLoading ? (
            <CardLoading />
          ) : (
            <ActionList
              actions={actions}
              emptyLabel="Тут пока ничего:)"
            />
          )}
        </div>
      </div>

      <AddEntrySheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        utgid={utgid}
        type={activityType}
        date={anchor}
      />
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h1 text-on">{title}</h1>
        <button
          type="button"
          aria-label="Календарь"
          onClick={onCalendar}
          className="flex h-11 w-11 items-center justify-center"
        >
          <CalendarGlyph />
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
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          aria-pressed={value === it.value}
          onClick={() => onChange(it.value)}
          className={`min-h-10 rounded-card px-4 text-bodySm font-medium transition-colors ${
            value === it.value ? "bg-accent text-on" : "bg-transparent text-on"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="3"
        stroke="#f08629"
        strokeWidth="2"
      />
      <path
        d="M8 3v4M16 3v4M3 10h18"
        stroke="#f08629"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AddGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="#f08629"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
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
