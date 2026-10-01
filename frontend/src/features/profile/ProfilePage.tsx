import { useNavigate } from "react-router-dom";
import { AppShell, GhostButton, Spinner } from "@/ui";
import { AccountCircleIcon, PencilIcon } from "@/ui/icons";
import { useUser, useWeightHistory } from "@/hooks/useUser";
import { formatFullDate, formatShortDate } from "@/lib/dates";
import { GOAL_LABEL, ACTIVITY_LABEL } from "./labels";

interface ProfilePageProps {
  utgid: number;
}

/**
 * Profile screen (Figma `профиль` 28:10).
 * Profile card + "Мой прогресс" weight chart + footer.
 */
export function ProfilePage({ utgid }: ProfilePageProps) {
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser(utgid);
  const { data: history } = useWeightHistory(utgid);

  if (isLoading || !user) {
    return (
      <AppShell className="items-center justify-center" aria-live="polite">
        <Spinner size={40} />
      </AppShell>
    );
  }

  const weightHistory = history ?? [];
  const orderedHistory = weightHistory
    .filter((entry) => Number.isFinite(entry.date) && Number.isFinite(entry.weight))
    .slice()
    .sort((a, b) => a.date - b.date);
  const firstWeight = orderedHistory[0]?.weight ?? user.weight;
  const diff = firstWeight - user.weight;

  return (
    <AppShell className="px-5 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-on">Профиль</h1>
      </div>

      {/* Profile card */}
      <section className="mt-5 rounded-card bg-[#272727] p-4">
        <div className="flex items-center gap-3">
          <AccountCircleIcon size={48} color="#ffffff" />
          <div className="min-w-0 flex-1">
            <p className="text-[24px] font-medium text-on">{user.name}</p>
            <p className="text-[16px] font-light text-on/80">
              {formatFullDate(user.date_of_birth)}
            </p>
          </div>
          <GhostButton
            onClick={() => navigate("/profile/edit")}
            aria-label="Редактировать"
            className="h-11 w-11 text-[#ff7700]"
          >
            <PencilIcon size={24} />
          </GhostButton>
        </div>

        <dl className="mt-4 flex flex-col gap-1.5 text-[16px] font-light text-on/80">
          <div>
            Цель: <span className="text-on">{GOAL_LABEL[user.goal]}</span>
          </div>
          <div>Вес: <span className="text-on">{user.weight} кг</span></div>
          <div>Рост: <span className="text-on">{user.height} см</span></div>
          <div>
            Ур. физ. активности:{" "}
            <span className="text-on">{ACTIVITY_LABEL[user.physical_activity]}</span>
          </div>
        </dl>
      </section>

      {/* Progress card */}
      <section className="mt-4 rounded-card bg-[#272727] p-4">
        <h2 className="text-[20px] font-medium text-on">Мой прогресс</h2>
        <WeightChart
          history={orderedHistory}
          currentWeight={user.weight}
          diff={diff}
        />
      </section>

      <p className="mt-6 text-center text-[20px] font-medium text-[#666666]">
        Powered by Burmaldun
      </p>
    </AppShell>
  );
}

/**
 * Minimal weight sparkline: dots for each entry (accent #ff7700), connecting
 * lines. Empty state is a simple hint.
 */
function WeightChart({
  history,
  currentWeight,
  diff,
}: {
  history: { date: number; weight: number }[];
  currentWeight: number;
  diff: number;
}) {
  const chartHistory = history.slice();
  const lastEntry = chartHistory.at(-1);
  if (!lastEntry || lastEntry.weight !== currentWeight) {
    chartHistory.push({ date: Math.floor(Date.now() / 1000), weight: currentWeight });
  }

  if (chartHistory.length < 2) {
    return (
      <p className="mt-4 text-center text-body text-on/70">
        Замеров веса пока мало — продолжай вести историю.
      </p>
    );
  }

  const weights = chartHistory.map((entry) => entry.weight);
  const actualMin = Math.min(...weights);
  const actualMax = Math.max(...weights);
  const span = actualMax - actualMin;
  const domainMin = span === 0 ? actualMin - 1 : actualMin - span * 0.12;
  const domainMax = span === 0 ? actualMax + 1 : actualMax + span * 0.12;
  const chart = { width: 360, height: 190, left: 42, right: 350, top: 18, bottom: 145 };
  const points = chartHistory.map((entry, index) => {
    const x = chart.left + (index / (chartHistory.length - 1)) * (chart.right - chart.left);
    const y = chart.bottom - ((entry.weight - domainMin) / (domainMax - domainMin)) * (chart.bottom - chart.top);
    return { x, y, weight: entry.weight, date: entry.date };
  });
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
    .join(" ");
  const message = diff === 0
    ? "Вес пока не изменился"
    : `Ты ${diff > 0 ? "сбросил" : "набрал"} ${formatWeight(Math.abs(diff))} кг`;

  return (
    <div className="mt-3 flex flex-col items-center">
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label={`Изменение веса: от ${points[0].weight} кг до ${currentWeight} кг`}
        className="h-auto w-full overflow-visible"
      >
        <line x1={chart.left} y1={chart.top} x2={chart.left} y2={chart.bottom} stroke="#666666" strokeWidth="1" />
        <line x1={chart.left} y1={chart.bottom} x2={chart.right} y2={chart.bottom} stroke="#666666" strokeWidth="1" />
        <text x="2" y={chart.top + 4} fill="#aaaaaa" fontSize="12">{formatWeight(actualMax)} кг</text>
        <text x="2" y={chart.bottom} fill="#aaaaaa" fontSize="12">{formatWeight(actualMin)} кг</text>
        <path d={path} fill="none" stroke="#ff7700" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={`${p.date}-${i}`}>
            <circle cx={p.x} cy={p.y} r="4" fill="#ff7700" />
            <text
              x={p.x}
              y={Math.max(12, p.y - 10)}
              fill="#ffffff"
              fontSize="12"
              textAnchor="middle"
            >
              {formatWeight(p.weight)}
            </text>
          </g>
        ))}
        <text x={chart.left} y="176" fill="#aaaaaa" fontSize="12" textAnchor="start">
          {formatShortDate(points[0].date)}
        </text>
        <text x={chart.right} y="176" fill="#aaaaaa" fontSize="12" textAnchor="end">
          {formatShortDate(points.at(-1)!.date)}
        </text>
      </svg>
      <p className="mt-2 text-[16px] text-on">{message}</p>
    </div>
  );
}

function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}
