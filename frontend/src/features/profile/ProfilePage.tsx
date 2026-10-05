import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ActionResponse } from "@/api/types";
import { GhostButton, Spinner } from "@/ui";
import { PencilIcon } from "@/ui/icons";
import { useActions } from "@/hooks/useActions";
import { useUser, useWeightHistory } from "@/hooks/useUser";
import { dayRange, formatFullDate, formatShortDate, nowStartOfDay } from "@/lib/dates";
import { getTgUser } from "@/lib/telegram";
import mockAvatar from "@/assets/telegram-avatar-mock.svg";
import { GOAL_LABEL, ACTIVITY_LABEL } from "./labels";

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
  const telegramAvatar = getTgUser()?.photo_url?.trim() || mockAvatar;
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
      <div className="flex flex-1 items-center justify-center" aria-live="polite">
        <Spinner size={40} />
      </div>
    );
  }

  const weightHistory = history ?? [];
  const orderedHistory = weightHistory
    .filter((entry) => Number.isFinite(entry.date) && Number.isFinite(entry.weight))
    .slice()
    .sort((a, b) => a.date - b.date);
  const bmi = user.weight / ((user.height / 100) ** 2);
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
      date: Math.floor(Date.now() / 1000),
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
          <img
            src={telegramAvatar}
            alt="Аватар пользователя"
            className="h-12 w-12 shrink-0 rounded-full object-cover"
            onError={(event) => {
              event.currentTarget.src = mockAvatar;
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[24px] font-medium text-on">{user.name}</p>
          </div>
          <GhostButton
            onClick={() => navigate("/profile/edit")}
            aria-label="Редактировать"
            className="h-11 w-11 text-[#ff7700]"
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
          points={weightPoints}
          unit="кг"
          emptyMessage="Добавь ещё один замер веса, чтобы увидеть динамику."
        />
      </section>

      <section className="mt-4 rounded-card bg-[#272727] p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[20px] font-medium text-on">Динамика ИМТ</h2>
          <span className="shrink-0 text-[16px] font-medium text-accent">{bmi.toFixed(1)}</span>
        </div>
        <p className="mt-1 text-caption text-on/60">По тем же датам, что и вес</p>
        <TrendChart
          points={bmiPoints}
          unit=""
          emptyMessage="Добавь ещё один замер веса, чтобы увидеть динамику ИМТ."
        />
      </section>

      <section className="mt-4 rounded-card bg-[#272727] p-4">
        <h2 className="text-[20px] font-medium text-on">Динамика потребления калорий</h2>
        <p className="mt-1 text-caption text-on/60">По дням · последние 7 дней</p>
        <DailyCaloriesChart
          days={dailyCalories}
          valueKey="food"
          isLoading={actionsLoading}
          label="Потреблено"
          emptyMessage="Пока нет записей о приёмах пищи."
        />
      </section>

      <section className="mt-4 rounded-card bg-[#272727] p-4">
        <h2 className="text-[20px] font-medium text-on">Динамика расхода калорий</h2>
        <p className="mt-1 text-caption text-on/60">Активность · последние 7 дней</p>
        <DailyCaloriesChart
          days={dailyCalories}
          valueKey="activity"
          isLoading={actionsLoading}
          label="Потрачено"
          emptyMessage="Пока нет записей об активности."
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
  const max = Math.max(actualMax, 1);
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
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label={`Динамика показателя: от ${formatValue(coordinates[0].value)} до ${formatValue(coordinates.at(-1)!.value)}`}
        className="mt-3 h-auto w-full overflow-visible"
      >
        <line x1={chart.left} y1={chart.top} x2={chart.left} y2={chart.bottom} stroke="#666" />
        <line x1={chart.left} y1={chart.bottom} x2={chart.right} y2={chart.bottom} stroke="#666" />
        <text x="2" y={chart.top + 4} fill="#aaa" fontSize="11">{formatValue(max)}</text>
        <text x="22" y={chart.bottom} fill="#aaa" fontSize="11">0</text>
        {coordinates.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <rect
              x={point.x}
              y={chart.bottom - point.height}
              width={barWidth}
              height={point.height}
              rx="5"
              fill="#f08629"
            />
            <title>{`${formatShortDate(point.date)}: ${formatValue(point.value)}`}</title>
            <text
              x={point.x + barWidth / 2}
              y={chart.bottom - point.height - 5}
              fill="#fff"
              fontSize="10"
              textAnchor="middle"
            >
              {formatValue(point.value)}
            </text>
            {(index === 0 || index === points.length - 1 || (points.length > 4 && index % 2 === 0)) && (
              <text
                x={point.x + barWidth / 2}
                y="160"
                fill="#aaa"
                fontSize="10"
                textAnchor="middle"
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
  const maxValue = Math.max(...values, 500);
  const hasValues = values.some((value) => value > 0);
  const chart = { width: 360, height: 174, left: 38, right: 354, top: 20, bottom: 136 };
  const barTop = chart.top + 20;
  const step = (chart.right - chart.left) / days.length;
  const barWidth = Math.min(25, step * 0.55);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-caption text-on/70">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        {label}, ккал
      </div>
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label={`${label} калорий за последние семь дней`}
        className="mt-1 h-auto w-full overflow-visible"
      >
        <line x1={chart.left} y1={chart.top} x2={chart.left} y2={chart.bottom} stroke="#666" />
        <line x1={chart.left} y1={chart.bottom} x2={chart.right} y2={chart.bottom} stroke="#666" />
        <text x="2" y={chart.top + 4} fill="#aaa" fontSize="11">{maxValue}</text>
        <text x="22" y={chart.bottom} fill="#aaa" fontSize="11">0</text>
        {days.map((day, index) => {
          const value = day[valueKey];
          const height = (value / maxValue) * (chart.bottom - barTop);
          const x = chart.left + index * step + (step - barWidth) / 2;
          const y = chart.bottom - height;
          return (
            <g key={day.date}>
              {value > 0 && <rect x={x} y={y} width={barWidth} height={height} rx="5" fill="#f08629" />}
              <title>{`${formatShortDate(day.date)}: ${value} ккал`}</title>
              {value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  fill="#fff"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {value}
                </text>
              )}
              <text x={x + barWidth / 2} y="160" fill="#aaa" fontSize="10" textAnchor="middle">
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
