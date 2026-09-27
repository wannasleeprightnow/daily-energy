import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell, GhostButton } from "@/ui";
import {
  ArrowLeftIcon,
  CalendarEventIcon,
  CrossIcon,
} from "@/ui/icons";
import { MONTHS_RU } from "@/constants";
import { WEEKDAYS_RU } from "./labels";
import { writeDayPick } from "@/features/main/DayContent";
import { haptic } from "@/lib/telegram";

interface CalendarPageProps {
  utgid: number;
}

/**
 * Calendar screen (Figma `28:12`).
 *
 * Header "Июль 2025" (fs27/w500) with the CalendarEvent icon (36×36, `#f08629`),
 * a close (Cross 24×24) and a month switcher (ArrowLeft / ArrowRight). The grid
 * is 316×394 r15 `#272727`: weekday headers (Пн-Вс fs22/w500) plus day cells
 * rendered as 20×20 ellipses (`#383838`, selected `#f08629`).
 *
 * Picking a day stores it through `writeDayPick()` and routes to the plan or
 * history view for that day, mirroring the Figma flow.
 */
export function CalendarPage({ utgid }: CalendarPageProps) {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  }));

  const shiftMonth = (delta: number) => {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  };

  const days = useMemo(() => monthGrid(view), [view]);

  const pickDay = (date: Date) => {
    setSelected({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    });
    haptic("success");
    // Past or today -> history; future -> plan (matches the day-content modes).
    const isPast =
      date.getTime() <
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const mode: "history" | "plan" = isPast ? "history" : "plan";
    writeDayPick(utgid, date, mode);
    void navigate(`/${mode}/food`);
  };

  return (
    <AppShell className="flex flex-col px-5 pb-24 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarEventIcon size={36} color="#f08629" />
          <h1 className="text-h3 font-medium text-on">
            {MONTHS_RU[view.getMonth()]} {view.getFullYear()}
          </h1>
        </div>

        <GhostButton onClick={() => navigate(-1)} aria-label="Закрыть">
          <CrossIcon size={24} />
        </GhostButton>
      </div>

      <div className="mt-5 flex w-full max-w-[316px] flex-col self-center rounded-card bg-[#272727] px-4 py-5">
        <div className="mb-3 grid grid-cols-7 gap-1">
          {WEEKDAYS_RU.map((wd) => (
            <span
              key={wd}
              className="text-center text-[22px] font-medium leading-[28px] text-on"
            >
              {wd}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-2">
          {days.map((cell, i) => {
            if (!cell) return <span key={`empty-${i}`} aria-hidden />;
            const isSelected =
              selected.year === cell.getFullYear() &&
              selected.month === cell.getMonth() &&
              selected.day === cell.getDate();
            return (
              <button
                key={cell.toISOString()}
                type="button"
                aria-label={cell.toDateString()}
                aria-pressed={isSelected}
                onClick={() => pickDay(cell)}
                className="flex h-11 items-center justify-center"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[12px] ${
                    isSelected ? "bg-[#f08629] text-on" : "bg-[#383838] text-on/70"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <GhostButton onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
            <ArrowLeftIcon size={27} />
          </GhostButton>
          <GhostButton
            onClick={() => shiftMonth(1)}
            aria-label="Следующий месяц"
            className="rotate-180"
          >
            <ArrowLeftIcon size={27} />
          </GhostButton>
        </div>
      </div>
    </AppShell>
  );
}

/**
 * Build a month grid aligned to Monday-first weeks.
 * Returns nulls for the leading blanks so the grid keeps its 7 columns.
 */
export function monthGrid(view: Date): (Date | null)[] {
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  // JS: 0 = Sunday … 6 = Saturday. We want Monday-first (0 = Monday).
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
