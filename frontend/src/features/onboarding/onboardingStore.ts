import type {
  Gender,
  Goal,
  PhysicalActivity,
} from "@/api/types";

import { useCallback, useMemo, useState } from "react";

import { LIMITS } from "@/constants";

/** Client-side draft accumulated through the onboarding steps. */
export interface ProfileDraft {
  name: string;
  gender: Gender | null;
  goal: Goal | null;
  weight: number | null;
  height: number | null;
  dateOfBirth: Date | null;
  physicalActivity: PhysicalActivity | null;
}

export interface OnboardingActions {
  setName: (v: string) => void;
  setGender: (v: Gender) => void;
  setGoal: (v: Goal) => void;
  setWeight: (v: number) => void;
  setHeight: (v: number) => void;
  setDateOfBirth: (v: Date) => void;
  setPhysicalActivity: (v: PhysicalActivity) => void;
}

export function emptyDraft(): ProfileDraft {
  const birthday = new Date();

  birthday.setFullYear(birthday.getFullYear() - 20);
  birthday.setHours(0, 0, 0, 0);

  return {
    name: "",
    gender: null,
    goal: null,
    weight: 70,
    height: 170,
    dateOfBirth: birthday,
    physicalActivity: null,
  };
}

/** Build the API-safe payload (without utgid, filled at submit time). */
export function draftToProfile(
  d: ProfileDraft,
): {
  name: string;
  gender: Gender;
  goal: Goal;
  weight: number;
  height: number;
  date_of_birth: number;
  physical_activity: PhysicalActivity;
} | null {
  if (
    !d.name.trim() ||
    d.name.trim().length > 50 ||
    !d.gender ||
    !d.goal ||
    d.weight === null || d.weight < LIMITS.weight.min || d.weight > LIMITS.weight.max ||
    d.height === null || d.height < LIMITS.height.min || d.height > LIMITS.height.max ||
    !d.dateOfBirth || !Number.isFinite(d.dateOfBirth.getTime()) ||
    Math.floor(d.dateOfBirth.getTime() / 1000) <= 0 ||
    !d.physicalActivity
  ) {
    return null;
  }

  return {
    name: d.name.trim(),
    gender: d.gender,
    goal: d.goal,
    weight: d.weight,
    height: d.height,
    date_of_birth: Math.floor(d.dateOfBirth.getTime() / 1000),
    physical_activity: d.physicalActivity,
  };
}

/** Higher-order state hook that exposes draft + setters. */
export function useOnboardingStore() {
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);

  const actions = useMemo<OnboardingActions>(() => {
    const patch = (p: Partial<ProfileDraft>) =>
      setDraft((prev) => ({ ...prev, ...p }));

    return {
      setName: (v: string) => patch({ name: v }),
      setGender: (v: Gender) => patch({ gender: v }),
      setGoal: (v: Goal) => patch({ goal: v }),
      setWeight: (v: number) => patch({ weight: v }),
      setHeight: (v: number) => patch({ height: v }),
      setDateOfBirth: (v: Date) => patch({ dateOfBirth: v }),
      setPhysicalActivity: (v: PhysicalActivity) => patch({ physicalActivity: v }),
    };
  }, []);

  const store = useCallback(
    () => ({ draft, ...actions }),
    [draft, actions],
  );

  return store;
}
