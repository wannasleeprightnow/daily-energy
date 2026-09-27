import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPlan, listPlans } from "@/api/plans";
import type { ActionType, PlanRequest, PlanResponse } from "@/api/types";

export function planKeys(
  utgid: number,
  range: { start_at: number; finish_at: number },
  type?: ActionType,
) {
  return ["plans", utgid, range.start_at, range.finish_at, type ?? "all"] as const;
}

/** List plans for the window, optional type filter. */
export function usePlans(
  utgid: number | undefined,
  range: { start_at: number; finish_at: number },
  type?: ActionType,
) {
  return useQuery<PlanResponse[]>({
    queryKey: planKeys(utgid ?? -1, range, type),
    enabled: !!utgid,
    queryFn: () => listPlans(utgid as number, range, type),
  });
}

/** POST /api/users/{utgid}/plans — builds a plan for a date. */
export function useCreatePlan(utgid: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: PlanRequest) => createPlan(utgid, plan),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["plans", utgid] }),
  });
}