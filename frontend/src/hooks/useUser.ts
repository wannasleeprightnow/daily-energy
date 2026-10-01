import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
    queryFn: () => getWeightHistory(utgid as number),
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
    mutationFn: async (patch: UserRequest) => updateUser(utgid, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.user(utgid) }),
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
