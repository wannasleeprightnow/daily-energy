import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Goal, PhysicalActivity } from "@/api/types";
import { AppShell, GhostButton, Input, OptionButton, Spinner, Text, WheelColumn } from "@/ui";
import { ArrowLeftIcon, CheckIcon } from "@/ui/icons";
import { useUpdateUser, useUser } from "@/hooks/useUser";
import { apiErrorMessage } from "@/api/client";
import { MONTHS_RU, LIMITS } from "@/constants";
import { haptic } from "@/lib/telegram";

interface EditProfilePageProps {
  utgid: number;
}

interface Draft {
  name: string;
  date_of_birth: number;
  goal: Goal;
  height: number;
  weight: number;
  physical_activity: PhysicalActivity;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HEIGHTS = Array.from(
  { length: LIMITS.height.max - LIMITS.height.min + 1 },
  (_, i) => LIMITS.height.min + i,
);
const WEIGHTS = Array.from(
  { length: LIMITS.weight.max - LIMITS.weight.min + 1 },
  (_, i) => LIMITS.weight.min + i,
);

const ACTIVITY_OPTIONS: { value: PhysicalActivity; title: string; subtitle: string }[] = [
  { value: "Low", title: "Низкая", subtitle: "Сидячий образ жизни" },
  { value: "Medium", title: "Умеренная", subtitle: "Тренировки 2–4 раза в неделю" },
  { value: "High", title: "Интенсивная", subtitle: "Тренировки 5–7 раз в неделю" },
];

const GOAL_OPTIONS: { value: Goal; label: string; emoji: string }[] = [
  { value: "LoseWeight", label: "Похудеть", emoji: "📉" },
  { value: "Maintain", label: "Поддерживать вес", emoji: "😊" },
  { value: "GainMuscleMass", label: "Набрать вес", emoji: "💪" },
];

export function EditProfilePage({ utgid }: EditProfilePageProps) {
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser(utgid);
  const updateUser = useUpdateUser(utgid);
  const [draft, setDraft] = useState<Draft | null>(null);
  const originalMeasurements = useRef<Pick<Draft, "weight" | "height"> | null>(null);

  const current = useMemo<Draft | null>(() => {
    if (draft) return draft;
    if (!user) return null;
    return {
      name: user.name,
      date_of_birth: user.date_of_birth,
      goal: user.goal,
      height: user.height,
      weight: user.weight,
      physical_activity: user.physical_activity,
    };
  }, [draft, user]);

  useEffect(() => {
    if (user && !originalMeasurements.current) {
      originalMeasurements.current = { weight: user.weight, height: user.height };
    }
  }, [user]);

  if (isLoading || !current || !user) {
    return (
      <AppShell className="items-center justify-center" aria-live="polite">
        <Spinner size={40} />
      </AppShell>
    );
  }

  const patch = (next: Partial<Draft>) => setDraft({ ...current, ...next });
  const birthday = new Date(current.date_of_birth * 1000);
  const day = birthday.getDate();
  const month = birthday.getMonth();
  const year = birthday.getFullYear();
  const updateBirthday = (d: number, m: number, y: number) => {
    const date = new Date(y, m, Math.min(d, daysInMonth(y, m)));
    patch({ date_of_birth: Math.floor(date.getTime() / 1000) });
  };

  const save = () => {
    updateUser.mutate(
      {
        patch: {
          name: current.name,
          gender: user.gender,
          date_of_birth: current.date_of_birth,
          weight: current.weight,
          height: current.height,
          goal: current.goal,
          physical_activity: current.physical_activity,
        },
        previousMeasurements: originalMeasurements.current ?? {
          weight: user.weight,
          height: user.height,
        },
      },
      {
        onSuccess: () => {
          haptic("success");
          void navigate("/profile");
        },
        onError: () => haptic("error"),
      },
    );
  };

  const labelClass = "mb-3 block text-[20px] font-medium text-on";

  return (
    <AppShell className="flex flex-col px-5 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <GhostButton onClick={() => navigate(-1)} aria-label="Назад" className="-ml-2 text-on">
          <ArrowLeftIcon size={27} />
        </GhostButton>
        <GhostButton
          onClick={save}
          aria-label="Сохранить"
          disabled={updateUser.isPending}
          className="text-[#ff7700]"
        >
          {updateUser.isPending ? <Spinner size={22} /> : <CheckIcon size={27} />}
        </GhostButton>
      </div>

      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-7 px-1 pb-8">
          <label className="block">
            <span className={labelClass}>Имя</span>
            <Input
              value={current.name}
              onChange={(event) => patch({ name: event.target.value })}
              aria-label="Имя"
              autoComplete="name"
              maxLength={50}
            />
          </label>

          <section aria-label="Рост">
            <h2 className={labelClass}>Рост</h2>
            <MeasurementPicker
              value={current.height}
              unit="см"
              values={HEIGHTS}
              onChange={(height) => patch({ height })}
            />
          </section>

          <section aria-label="Вес">
            <h2 className={labelClass}>Вес</h2>
            <MeasurementPicker
              value={current.weight}
              unit="кг"
              values={WEIGHTS}
              onChange={(weight) => patch({ weight })}
            />
          </section>

          <section aria-label="Дата рождения">
            <h2 className={labelClass}>Дата рождения</h2>
            <div className="flex w-full justify-between gap-1 overflow-hidden rounded-card bg-surface px-2 py-4">
              <WheelColumn
                ariaLabel="День рождения"
                label="День"
                values={DAYS}
                selected={day}
                onSelect={(value) => updateBirthday(value, month, year)}
                viewportClassName="w-full"
                valueClassName="text-[22px]"
              />
              <WheelColumn
                ariaLabel="Месяц рождения"
                label="Месяц"
                values={MONTHS_RU}
                selected={MONTHS_RU[month]}
                onSelect={(value) => updateBirthday(day, MONTHS_RU.indexOf(value), year)}
                viewportClassName="w-full"
                valueClassName="truncate text-[clamp(15px,4.8vw,22px)]"
              />
              <WheelColumn
                ariaLabel="Год рождения"
                label="Год"
                values={Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i)}
                selected={year}
                onSelect={(value) => updateBirthday(day, month, value)}
                viewportClassName="w-full"
                valueClassName="text-[22px]"
              />
            </div>
          </section>

          <section aria-label="Цель">
            <h2 className={labelClass}>Цель</h2>
            <div className="flex flex-col gap-3">
              {GOAL_OPTIONS.map((goal) => (
                <OptionButton
                  key={goal.value}
                  selected={current.goal === goal.value}
                  onClick={() => patch({ goal: goal.value })}
                  className="min-h-[64px] justify-between"
                >
                  <span>{goal.label}</span><span aria-hidden>{goal.emoji}</span>
                </OptionButton>
              ))}
            </div>
          </section>

          <section aria-label="Уровень физической активности">
            <h2 className={labelClass}>Уровень физической активности</h2>
            <div className="flex flex-col gap-3">
              {ACTIVITY_OPTIONS.map((activity) => (
                <OptionButton
                  key={activity.value}
                  selected={current.physical_activity === activity.value}
                  onClick={() => patch({ physical_activity: activity.value })}
                  className="min-h-[76px]"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-[20px] font-medium">{activity.title}</span>
                    <span className="text-[15px] text-on/70">{activity.subtitle}</span>
                  </span>
                </OptionButton>
              ))}
            </div>
          </section>

        {updateUser.isError && (
          <Text kind="small" className="mt-4 text-center text-danger">
            {apiErrorMessage(updateUser.error)}
          </Text>
        )}
      </div>
    </AppShell>
  );
}

function MeasurementPicker({
  value,
  unit,
  values,
  onChange,
}: {
  value: number;
  unit: string;
  values: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex min-h-[150px] justify-center rounded-card bg-surface px-4 py-3">
      <WheelColumn
        ariaLabel={unit === "см" ? "Рост в сантиметрах" : "Вес в килограммах"}
        label={unit}
        values={values}
        selected={value}
        onSelect={onChange}
        viewportClassName="w-[110px]"
      />
    </div>
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
