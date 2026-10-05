import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addWeightEntry,
  createUser,
  getWeightHistory,
  getUser,
  isConflict,
  updateUser,
} from "@/api/users";
import type { UserCreate, UserRequest, UserResponse } from "@/api/types";
import { getInitData, getTgId } from "@/lib/telegram";

export const queryKeys = {
  user: (utgid: number) => ["user", utgid] as const,
  weightHistory: (utgid: number) => ["weightHistory", utgid] as const,
};

/**
 * Reads the user for the current Telegram account. `null` in `user` means
 * "not created yet" (onboarding required); `undefined` is reserved for the
 * initial loading state managed by React Query.
 */
export function useUser(utgid?: number) {
  return useQuery<UserResponse | null, Error>({
    queryKey: queryKeys.user(utgid ?? -1),
    enabled: !!utgid,
    queryFn: async () => {
      try {
        return await getUser(utgid as number);
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
export function useWeightHistory(utgid?: number) {
  return useQuery({
    queryKey: queryKeys.weightHistory(utgid ?? -1),
    enabled: !!utgid,
    queryFn: async () => {
      const history = (await getWeightHistory(utgid as number)) ?? [];
      return history.sort((a, b) => a.date - b.date);
    },
  });
}

/** POST /api/users during onboarding. */
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Omit<UserCreate, "utgid">) => {
      const id = getTgId();
      if (!id) throw new Error("Нет Telegram-идентификатора");
      await createUser({ ...profile, utgid: id });
      return profile;
    },
    onSuccess: () => {
      const id = getTgId();
      if (id) void qc.invalidateQueries({ queryKey: queryKeys.user(id) });
    },
  });
}

/** PUT /api/users for the edit-profile flow. */
export function useUpdateUser(utgid: number) {
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

      if (!measurementsChanged) return updateUser(utgid, patch);

      // Read history before writing so retries after a partial failure can
      // avoid duplicate snapshots and complete a missing final snapshot.
      const history = (await getWeightHistory(utgid)) ?? [];
      const latest = [...history].sort((a, b) => a.date - b.date).at(-1);
      const snapshotDate = Math.floor(Date.now() / 1000);

      if (history.length === 0) {
        await addWeightEntry(utgid, {
          date: Math.max(1, snapshotDate - 1),
          weight: previousMeasurements.weight,
          height: previousMeasurements.height,
        });
      }

      const updatedUser = await updateUser(utgid, patch);
      if (latest?.weight !== patch.weight || latest?.height !== patch.height) {
        const lastRecordedDate = latest?.date ?? snapshotDate - 1;
        await addWeightEntry(utgid, {
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
      qc.setQueryData(queryKeys.user(utgid), updatedUser);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.user(utgid) });
      void qc.invalidateQueries({ queryKey: queryKeys.weightHistory(utgid) });
    },
  });
}

/** Exposes whether the create flow failed because the user already exists. */
export function isUserExistsError(err: unknown): boolean {
  return isConflict(err);
}

/** Ensure the initData header is attached before any request. */
export function getAuthHeader(): string {
  return getInitData();
}
