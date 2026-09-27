import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Goal, PhysicalActivity } from "@/api/types";
import { AppShell, GhostButton, Spinner, Text } from "@/ui";
import { ArrowLeftIcon, CheckIcon } from "@/ui/icons";
import { useUpdateUser, useUser } from "@/hooks/useUser";
import { apiErrorMessage } from "@/api/client";
import { formatFullDate } from "@/lib/dates";
import { haptic } from "@/lib/telegram";
import { LIMITS } from "@/constants";
import { ACTIVITY_LABEL, GOAL_LABEL } from "./labels";

interface EditProfilePageProps {
  utgid: number;
}

/** Editable field keys, in the order shown on the Figma card (`150:360`). */
type FieldKey =
  | "name"
  | "date_of_birth"
  | "goal"
  | "height"
  | "weight"
  | "physical_activity";

interface Draft {
  name: string;
  date_of_birth: number;
  goal: Goal;
  height: number;
  weight: number;
  physical_activity: PhysicalActivity;
}

const GOALS: Goal[] = ["LoseWeight", "Maintain", "GainMuscleMass"];
const ACTIVITIES: PhysicalActivity[] = ["Low", "Medium", "High"];

/**
 * "Профиль изменить" screen (Figma `150:360`).
 *
 * Card 320×673 r15 `#272727`; each row is a label (fs22/w500) with a value in
 * a black input (r17 `#000`). Values cycle with the ArrowLeft / ArrowRight
 * controls (27×27, white); the Check button (27×27, `#ff7700`) saves via
 * `PUT /api/users/{utgid}`.
 */
export function EditProfilePage({ utgid }: EditProfilePageProps) {
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser(utgid);
  const updateUser = useUpdateUser(utgid);

  const [draft, setDraft] = useState<Draft | null>(null);

  // Seed the local draft once the user record arrives.
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

  if (isLoading || !current) {
    return (
      <AppShell className="items-center justify-center" aria-live="polite">
        <Spinner size={40} />
      </AppShell>
    );
  }

  const patch = (next: Partial<Draft>) => {
    setDraft({ ...current, ...next });
  };

  const cycle = <T,>(values: readonly T[], value: T, dir: 1 | -1): T => {
    const idx = Math.max(0, values.indexOf(value));
    const next = (idx + dir + values.length) % values.length;
    return values[next];
  };

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const save = () => {
    updateUser.mutate(
      {
        name: current.name,
        gender: user!.gender,
        date_of_birth: current.date_of_birth,
        weight: current.weight,
        height: current.height,
        goal: current.goal,
        physical_activity: current.physical_activity,
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

  const fields: {
    key: FieldKey;
    label: string;
    value: string;
    onPrev: () => void;
    onNext: () => void;
  }[] = [
    {
      key: "name",
      label: "Имя",
      value: current.name,
      onPrev: () => patch({ name: current.name }),
      onNext: () => patch({ name: current.name }),
    },
    {
      key: "date_of_birth",
      label: "Дата рождения",
      value: formatFullDate(current.date_of_birth),
      onPrev: () => patch({ date_of_birth: shiftDays(current.date_of_birth, -1) }),
      onNext: () => patch({ date_of_birth: shiftDays(current.date_of_birth, 1) }),
    },
    {
      key: "goal",
      label: "Цель",
      value: GOAL_LABEL[current.goal],
      onPrev: () => patch({ goal: cycle(GOALS, current.goal, -1) }),
      onNext: () => patch({ goal: cycle(GOALS, current.goal, 1) }),
    },
    {
      key: "height",
      label: "Рост",
      value: `${current.height} см`,
      onPrev: () =>
        patch({ height: clamp(current.height - 1, LIMITS.height.min, LIMITS.height.max) }),
      onNext: () =>
        patch({ height: clamp(current.height + 1, LIMITS.height.min, LIMITS.height.max) }),
    },
    {
      key: "weight",
      label: "Вес",
      value: `${current.weight} кг`,
      onPrev: () =>
        patch({ weight: clamp(current.weight - 1, LIMITS.weight.min, LIMITS.weight.max) }),
      onNext: () =>
        patch({ weight: clamp(current.weight + 1, LIMITS.weight.min, LIMITS.weight.max) }),
    },
    {
      key: "physical_activity",
      label: "Ур. физ. активности",
      value: ACTIVITY_LABEL[current.physical_activity],
      onPrev: () =>
        patch({ physical_activity: cycle(ACTIVITIES, current.physical_activity, -1) }),
      onNext: () =>
        patch({ physical_activity: cycle(ACTIVITIES, current.physical_activity, 1) }),
    },
  ];

  return (
    <AppShell className="flex flex-col px-5 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <GhostButton
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="-ml-2 text-on"
        >
          <ArrowLeftIcon size={27} />
        </GhostButton>

        <GhostButton
          onClick={save}
          aria-label="Сохранить"
          disabled={updateUser.isPending}
          className="text-[#ff7700]"
        >
          {updateUser.isPending ? (
            <Spinner size={22} />
          ) : (
            <CheckIcon size={27} />
          )}
        </GhostButton>
      </div>

      <div className="flex flex-col items-center">
        <div className="w-full max-w-[320px] rounded-card bg-[#272727] px-4 py-5">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-3 py-3">
              <span className="w-[110px] shrink-0 text-[22px] font-medium leading-[28px] text-on">
                {f.label}
              </span>

              <div className="flex min-w-0 flex-1 items-center gap-2">
                <GhostButton
                  onClick={f.onPrev}
                  aria-label={`${f.label}: предыдущее`}
                  className="h-11 w-11 shrink-0 text-on"
                >
                  <ArrowLeftIcon size={27} />
                </GhostButton>

                <span className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-[17px] bg-black px-3 text-[16px] font-light text-on">
                  <span className="truncate">{f.value}</span>
                </span>

                <GhostButton
                  onClick={f.onNext}
                  aria-label={`${f.label}: следующее`}
                  className="h-11 w-11 shrink-0 text-on"
                >
                  <ArrowRight />
                </GhostButton>
              </div>
            </div>
          ))}
        </div>

        {updateUser.isError && (
          <Text kind="small" className="mt-4 text-center text-danger">
            {apiErrorMessage(updateUser.error)}
          </Text>
        )}
      </div>
    </AppShell>
  );
}

/** Mirror of ArrowLeftIcon for the "next" control (Figma uses a rotated arrow). */
function ArrowRight() {
  return (
    <span className="inline-flex rotate-180">
      <ArrowLeftIcon size={27} />
    </span>
  );
}

/** Shift a unix-seconds timestamp by whole days. */
function shiftDays(timestampSeconds: number, days: number): number {
  const d = new Date(timestampSeconds * 1000);
  d.setDate(d.getDate() + days);
  return Math.floor(d.getTime() / 1000);
}
