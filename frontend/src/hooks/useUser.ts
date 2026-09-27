import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  getWeightHistory,
  getUser,
  isConflict,
  isNotFound,
  updateUser,
} from "@/api/users";
import type { UserCreate, UserRequest, UserResponse } from "@/api/types";
import { getInitData, getTgId } from "@/lib/telegram";

export const queryKeys = {
  user: (utgid: number) => ["user", utgid] as const,
  weightHistory: (utgid: number) => ["weightHistory", utgid] as const,
};

/**
 * Reads the user for the current Telegram account. `undefined` in `user`
 * means "not created yet" (onboarding required).
 */
export function useUser(utgid?: number) {
  return useQuery<UserResponse | undefined, Error>({
    queryKey: queryKeys.user(utgid ?? -1),
    enabled: !!utgid,
    queryFn: async () => {
      try {
        return await getUser(utgid as number);
      } catch (err) {
        if (isNotFound(err)) return undefined;
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