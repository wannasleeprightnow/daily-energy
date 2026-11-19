import type { UserCreate, UserRequest, UserResponse } from "@/api/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addWeightEntry,
  createUser,
  getWeightHistory,
  getUser,
  isConflict,
  updateUser,
} from "@/api/users";

export const queryKeys = {
  user: (user_id: number) => ["user", user_id] as const,
  weightHistory: (user_id: number) => ["weightHistory", user_id] as const,
};

/**
 * Reads the user for the current browser account. `null` in `user` means
 * "not created yet" (onboarding required); `undefined` is reserved for the
 * initial loading state managed by React Query.
 */
export function useUser(user_id?: number) {
  return useQuery<UserResponse | null, Error>({
    queryKey: queryKeys.user(user_id ?? -1),
    enabled: !!user_id,
    queryFn: async () => {
      try {
        return await getUser(user_id as number);
      } catch (err) {
        const error = err as {
          name?: unknown;
          message?: unknown;
          response?: { status?: unknown; data?: unknown; statusText?: unknown };
        };
        const responseBody = error?.response?.data;
        const errorText = [
          error?.message,
          error?.response?.statusText,
          typeof responseBody === "string"
            ? responseBody
            : JSON.stringify(responseBody ?? ""),
        ]
          .filter((part): part is string => typeof part === "string")
          .join(" ")
          .toLowerCase();

        if (errorText.includes("record not found")) {
          return null;
        }
        throw err;
      }
    },
  });
}

/** Weight history for the profile progress chart. */
export function useWeightHistory(user_id?: number) {
  return useQuery({
    queryKey: queryKeys.weightHistory(user_id ?? -1),
    enabled: !!user_id,
    queryFn: async () => {
      const history = (await getWeightHistory(user_id as number)) ?? [];

      return history.sort((a, b) => a.date - b.date);
    },
  });
}

/** POST /api/users during onboarding. */
export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Omit<UserCreate, "user_id">) => {
      await createUser(profile);

      return profile;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

/** PUT /api/users for the edit-profile flow. */
export function useUpdateUser(user_id: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patch,
      previousMeasurements,
    }: {
      patch: UserRequest;
      previousMeasurements: Pick<UserRequest, "weight" | "height">;
    }) => {
      const measurementsChanged =
        patch.weight !== previousMeasurements.weight ||
        patch.height !== previousMeasurements.height;

      if (!measurementsChanged) return updateUser(user_id, patch);

      // Read history before writing so retries after a partial failure can
      // avoid duplicate snapshots and complete a missing final snapshot.
      const history = (await getWeightHistory(user_id)) ?? [];
      const latest = [...history].sort((a, b) => a.date - b.date).at(-1);
      const snapshotDate = Math.floor(Date.now() / 1000);

      if (history.length === 0) {
        await addWeightEntry(user_id, {
          date: Math.max(1, snapshotDate - 1),
          weight: previousMeasurements.weight,
          height: previousMeasurements.height,
        });
      }

      const updatedUser = await updateUser(user_id, patch);

      if (latest?.weight !== patch.weight || latest?.height !== patch.height) {
        const lastRecordedDate = latest?.date ?? snapshotDate - 1;

        await addWeightEntry(user_id, {
          date: Math.max(Math.floor(Date.now() / 1000), lastRecordedDate + 1),
          weight: patch.weight,
          height: patch.height,
        });
      }

      return updatedUser;
    },
    onSuccess: (updatedUser) => {
      // Publish the saved profile immediately so plan generation starts with
      // the new profile before the user returns to a plan screen.
      qc.setQueryData(queryKeys.user(user_id), updatedUser);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.user(user_id) });
      void qc.invalidateQueries({ queryKey: queryKeys.weightHistory(user_id) });
    },
  });
}

/** Exposes whether the create flow failed because the user already exists. */
export function isUserExistsError(err: unknown): boolean {
  return isConflict(err);
}
