import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAction, listActions } from "@/api/plans";
import type { ActionRequest, ActionResponse, ActionType } from "@/api/types";

export function actionKeys(
  utgid: number,
  range: { start_at: number; finish_at: number },
  type?: ActionType,
) {
  return ["actions", utgid, range.start_at, range.finish_at, type ?? "all"] as const;
}

/** List actions in the given window, optional type filter. */
export function useActions(
  utgid: number | undefined,
  range: { start_at: number; finish_at: number },
  type?: ActionType,
) {
  return useQuery<ActionResponse[]>({
    queryKey: actionKeys(utgid ?? -1, range, type),
    enabled: !!utgid,
    queryFn: () => listActions(utgid as number, range, type),
  });
}

/** POST /api/users/{utgid}/actions */
export function useCreateAction(utgid: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: ActionRequest) => createAction(utgid, action),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["actions", utgid] }),
  });
}