import type { ActionResponse } from "@/api/types";

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { GOAL_LABEL, ACTIVITY_LABEL } from "./labels";

import { GhostButton, Spinner } from "@/ui";
import { PencilIcon } from "@/ui/icons";
import { useActions } from "@/hooks/useActions";
import { useUser, useWeightHistory } from "@/hooks/useUser";
import { dayRange, formatFullDate, formatShortDate, nowStartOfDay } from "@/lib/dates";
import { getTgUser } from "@/lib/telegram";


interface ProfilePageProps {
  utgid: number;
}

/**
 * Profile screen (Figma `профиль` 28:10).
 * Profile details with weight, BMI, and calorie history charts.
 */
export function ProfilePage({ utgid }: ProfilePageProps) {
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser(utgid);
  const { data: history } = useWeightHistory(utgid);
  const telegramAvatar = getTgUser()?.photo_url?.trim();
  const calorieRange = useMemo(() => {
    const today = nowStartOfDay();
    const start = new Date(today);

    start.setDate(start.getDate() - 6);

    return {
      start_at: dayRange(start).start_at,
      finish_at: dayRange(today).finish_at,
    };
  }, []);
  const { data: actions, isLoading: actionsLoading } = useActions(utgid, calorieRange);

  if (isLoading || !user) {
    return (
      <div aria-live="polite" className="flex flex-1 items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  const weightHistory = history ?? [];
  const orderedHistory = weightHistory
    .filter((entry) => Number.isFinite(entry.date) && Number.isFinite(entry.weight))
    .slice()
    .sort((a, b) => a.date - b.date);
  const measurementHistory = orderedHistory
    .filter((entry) => Number.isFinite(entry.height) && entry.height > 0)
    .map((entry) => ({
      date: entry.date,
      weight: entry.weight,
      height: entry.height,
    }));
  const todayStartAt = dayRange(nowStartOfDay()).start_at;
  const lastMeasurement = measurementHistory.at(-1);

  if (
    !lastMeasurement ||
    lastMeasurement.date < todayStartAt ||
    lastMeasurement.weight !== user.weight ||
    lastMeasurement.height !== user.height
  ) {
    measurementHistory.push({
      date: Math.max(todayStartAt, (lastMeasurement?.date ?? 0) + 1),
      weight: user.weight,
      height: user.height,
    });
  }
  const chartMeasurements = measurementHistory.slice(-7);
  const weightPoints = chartMeasurements.map(({ date, weight }) => ({ date, value: weight }));
  const bmiPoints = chartMeasurements.map(({ date, weight, height }) => ({
    date,
    value: weight / ((height / 100) ** 2),
  }));
  const dailyCalories = buildDailyCalories(calorieRange.start_at, actions ?? []);

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-on">Профиль</h1>
      </div>

      {/* Profile card */}
      <section className="mt-5 rounded-card bg-[#272727] p-4">
        <div className="flex items-center gap-3">
          {telegramAvatar ? (
            <img
              alt="Аватар пользователя"
              className="h-12 w-12 shrink-0 rounded-full object-cover"
              src={telegramAvatar}
            />
          ) : (
            <div
              aria-label="Аватар пользователя"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#383838] text-lg font-medium text-on"
            >
              {user.name.trim().charAt(0).toLocaleUpperCase() || "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[24px] font-medium text-on">{user.name}</p>
          </div>
          <GhostButton
            aria-label="Редактировать"
            className="h-11 w-11 text-[#ff7700]"
            onClick={() => navigate("/profile/edit")}
          >
            <PencilIcon size={24} />
          </GhostButton>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-2">
          <ProfileMetric label="Рост" value={`${user.height} см`} />
          <ProfileMetric label="Вес" value={`${user.weight} кг`} />
          <ProfileMetric label="Дата рождения" value={formatFullDate(user.date_of_birth)} />
          <ProfileMetric label="Цель" value={GOAL_LABEL[user.goal]} />
          <ProfileMetric label="Уровень активности" value={ACTIVITY_LABEL[user.physical_activity]} />
        </dl>
      </section>

      {/* Weight chart */}
      <section className="mt-4 rounded-card bg-[#272727] p-4">
        <h2 className="text-[20px] font-medium text-on">Динамика веса</h2>
        <TrendChart
          emptyMessage="Добавь ещё один замер веса, чтобы увидеть динамику."
          points={weightPoints}
          unit="кг"
        />
      </section>

      <section className="mt-4 rounded-card bg-[#272727] p-4">
        <h2 className="text-[20px] font-medium text-on">Динамика ИМТ</h2>
        <TrendChart
          emptyMessage="Добавь ещё один замер веса, чтобы увидеть динамику ИМТ."
          points={bmiPoints}
          unit=""
        />
      </section>

      <section className="mt-4 rounded-card bg-[#272727] p-4">
        <h2 className="text-[20px] font-medium text-on">Динамика потребления калорий</h2>
        <DailyCaloriesChart
          days={dailyCalories}
          emptyMessage="Пока нет записей о приёмах пищи."
          isLoading={actionsLoading}
          label="Потреблено"
          valueKey="food"
        />
      </section>

      <section className="mt-4 rounded-card bg-[#272727] p-4">
        <h2 className="text-[20px] font-medium text-on">Динамика расхода калорий</h2>
        <DailyCaloriesChart
          days={dailyCalories}
          emptyMessage="Пока нет записей об активности."
          isLoading={actionsLoading}
          label="Потрачено"
          valueKey="activity"
        />
      </section>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-card bg-surface px-3 py-2.5">
      <dt className="text-caption text-on/60">{label}</dt>
      <dd className="mt-0.5 break-words text-[16px] leading-5 text-on">{value}</dd>
    </div>
  );
}

interface TrendPoint {
  date: number;
  value: number;
}

function TrendChart({
  points,
  unit,
  emptyMessage,
}: {
  points: TrendPoint[];
  unit: string;
  emptyMessage: string;
}) {
  if (points.length === 0) {
    return <p className="mt-4 text-center text-bodySm text-on/65">{emptyMessage}</p>;
  }

  const values = points.map((point) => point.value);
  const actualMax = Math.max(...values);
  // Keep headroom so the value label stays visibly above the tallest bar.
  const max = Math.max(actualMax * 1.2, 1);
  const chart = { width: 360, height: 174, left: 42, right: 354, top: 20, bottom: 136 };
  const barTop = chart.top + 20;
  const step = (chart.right - chart.left) / points.length;
  const barWidth = Math.min(28, step * 0.56);
  const coordinates = points.map((point, index) => ({
    ...point,
    x: chart.left + index * step + (step - barWidth) / 2,
    height: (point.value / max) * (chart.bottom - barTop),
  }));
  const formatValue = (value: number) => `${value.toFixed(1)}${unit ? ` ${unit}` : ""}`;

  return (
    <div>
      <svg
        aria-label={`Динамика показателя: от ${formatValue(coordinates[0].value)} до ${formatValue(coordinates.at(-1)!.value)}`}
        className="mt-3 h-auto w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
      >
        <line stroke="#666" x1={chart.left} x2={chart.left} y1={chart.top} y2={chart.bottom} />
        <line stroke="#666" x1={chart.left} x2={chart.right} y1={chart.bottom} y2={chart.bottom} />
        <text fill="#aaa" fontSize="11" x="2" y={chart.top + 4}>{formatValue(max)}</text>
        <text fill="#aaa" fontSize="11" x="22" y={chart.bottom}>0</text>
        {coordinates.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <rect
              fill="#f08629"
              height={point.height}
              rx="5"
              width={barWidth}
              x={point.x}
              y={chart.bottom - point.height}
            />
            <title>{`${formatShortDate(point.date)}: ${formatValue(point.value)}`}</title>
            <text
              fill="#fff"
              fontSize="10"
              textAnchor="middle"
              x={point.x + barWidth / 2}
              y={chart.bottom - point.height - 8}
            >
              {formatValue(point.value)}
            </text>
            {(index === 0 || index === points.length - 1 || (points.length > 4 && index % 2 === 0)) && (
              <text
                fill="#aaa"
                fontSize="10"
                textAnchor="middle"
                x={point.x + barWidth / 2}
                y="160"
              >
                {formatShortDate(point.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {points.length < 2 && (
        <p className="mt-1 text-center text-caption text-on/60">{emptyMessage}</p>
      )}
    </div>
  );
}

interface DailyCalories {
  date: number;
  food: number;
  activity: number;
}

function buildDailyCalories(startAt: number, actions: ActionResponse[]): DailyCalories[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startAt * 1000);

    date.setDate(date.getDate() + index);
    const range = dayRange(date);

    return actions.reduce<DailyCalories>(
      (daily, action) => {
        if (action.date >= range.start_at && action.date <= range.finish_at) {
          if (action.type === "Food") daily.food += action.calories;
          if (action.type === "Activity") daily.activity += action.calories;
        }

        return daily;
      },
      { date: range.start_at, food: 0, activity: 0 },
    );
  });
}

function DailyCaloriesChart({
  days,
  valueKey,
  isLoading,
  label,
  emptyMessage,
}: {
  days: DailyCalories[];
  valueKey: "food" | "activity";
  isLoading: boolean;
  label: string;
  emptyMessage: string;
}) {
  const values = days.map((day) => day[valueKey]);
  const actualMax = Math.max(...values);
  // Reserve 20% of the vertical range for labels above the tallest bar.
  const maxValue = Math.max(Math.ceil(actualMax * 1.2), 500);
  const hasValues = values.some((value) => value > 0);
  const chart = { width: 360, height: 174, left: 38, right: 354, top: 20, bottom: 136 };
  const barTop = chart.top + 20;
  const step = (chart.right - chart.left) / days.length;
  const barWidth = Math.min(25, step * 0.55);

  return (
    <div className="mt-2">
      <svg
        aria-label={`${label} калорий за последние семь дней`}
        className="mt-1 h-auto w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
      >
        <line stroke="#666" x1={chart.left} x2={chart.left} y1={chart.top} y2={chart.bottom} />
        <line stroke="#666" x1={chart.left} x2={chart.right} y1={chart.bottom} y2={chart.bottom} />
        <text fill="#aaa" fontSize="11" x="2" y={chart.top + 4}>{maxValue}</text>
        <text fill="#aaa" fontSize="11" x="22" y={chart.bottom}>0</text>
        {days.map((day, index) => {
          const value = day[valueKey];
          const height = (value / maxValue) * (chart.bottom - barTop);
          const x = chart.left + index * step + (step - barWidth) / 2;
          const y = chart.bottom - height;

          return (
            <g key={day.date}>
              {value > 0 && <rect fill="#f08629" height={height} rx="5" width={barWidth} x={x} y={y} />}
              <title>{`${formatShortDate(day.date)}: ${value} ккал`}</title>
              {value > 0 && (
                <text
                  fill="#fff"
                  fontSize="9"
                  textAnchor="middle"
                  x={x + barWidth / 2}
                  y={y - 8}
                >
                  {value}
                </text>
              )}
              <text fill="#aaa" fontSize="10" textAnchor="middle" x={x + barWidth / 2} y="160">
                {formatShortDate(day.date)}
              </text>
            </g>
          );
        })}
      </svg>
      {!isLoading && !hasValues && (
        <p className="mt-1 text-center text-caption text-on/60">{emptyMessage}</p>
      )}
      {isLoading && <p className="text-center text-caption text-on/60">Загружаем записи…</p>}
    </div>
  );
}
