import { useCallback, useMemo, useState } from "react";
import type {
  Gender,
  Goal,
  PhysicalActivity,
} from "@/api/types";

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
  return {
    name: "",
    gender: null,
    goal: null,
    weight: null,
    height: null,
    dateOfBirth: null,
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
    !d.gender ||
    !d.goal ||
    d.weight === null ||
    d.height === null ||
    !d.dateOfBirth ||
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