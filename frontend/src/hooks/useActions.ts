import type { ActionRequest, ActionResponse, ActionType } from "@/api/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createAction, listActions } from "@/api/plans";

export function actionKeys(
  user_id: number,
  range: { start_at: number; finish_at: number },
  type?: ActionType,
) {
  return ["actions", user_id, range.start_at, range.finish_at, type ?? "all"] as const;
}

/** List actions in the given window, optional type filter. */
export function useActions(
  user_id: number | undefined,
  range: { start_at: number; finish_at: number },
  type?: ActionType,
) {
  return useQuery<ActionResponse[]>({
    queryKey: actionKeys(user_id ?? -1, range, type),
    enabled: !!user_id,
    queryFn: () => listActions(user_id as number, range, type),
  });
}

/** POST /api/users/{user_id}/actions */
export function useCreateAction(user_id: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (action: ActionRequest) => createAction(user_id, action),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["actions", user_id] }),
  });
}