import type { UserResponse } from "@/api/types";

type PlanProfile = Pick<
  UserResponse,
  | "gender"
  | "date_of_birth"
  | "weight"
  | "height"
  | "goal"
  | "physical_activity"
>;

/** Stable cache key for plan data derived from a user's profile. */
export function getPlanProfileKey(user: PlanProfile | null | undefined): string {
  if (!user) return "";

  return JSON.stringify([
    user.gender,
    user.date_of_birth,
    user.weight,
    user.height,
    user.goal,
    user.physical_activity,
  ]);
}
