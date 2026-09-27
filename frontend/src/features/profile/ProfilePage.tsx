import { useNavigate } from "react-router-dom";
import { AppShell, GhostButton, Spinner } from "@/ui";
import { AccountCircleIcon, PencilIcon } from "@/ui/icons";
import { useUser, useWeightHistory } from "@/hooks/useUser";
import { formatFullDate } from "@/lib/dates";
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
  const start = weightHistory[0]?.weight ?? user.weight;
  const end = user.weight;
  const diff = start - end;

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
          history={weightHistory}
          message={`Ты ${diff >= 0 ? "сбросил" : "набрал"} ${Math.abs(diff)} кг!`}
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
  message,
}: {
  history: { date: number; weight: number }[];
  message: string;
}) {
  if (history.length < 2) {
    return (
      <p className="mt-4 text-center text-body text-on/70">
        Замеров веса пока мало — продолжай вести историю.
      </p>
    );
  }

  const weights = history.map((h) => h.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const w = 280;
  const h = 120;
  const pad = 12;
  const points = history.map((pt, i) => {
    const x = pad + (i / (history.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (pt.weight - min) / range) * (h - pad * 2);
    return { x, y, w: pt.weight };
  });
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="mt-2 flex flex-col items-center">
      <svg width={w} height={h} aria-hidden className="overflow-visible">
        <path d={path} fill="none" stroke="#ffffff" strokeWidth="1.5" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#ff7700" />
        ))}
      </svg>
      <p className="mt-2 text-[16px] text-on">{message}</p>
    </div>
  );
}