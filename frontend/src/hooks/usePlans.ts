import type { ActionType, PlanRequest, PlanResponse } from "@/api/types";

import { useEffect } from "react";
import { useIsFetching, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createPlan, listPlans } from "@/api/plans";
import { dayRange } from "@/lib/dates";

export function planKeys(
  user_id: number,
  range: { start_at: number; finish_at: number },
  type?: ActionType,
) {
  return ["plans", user_id, range.start_at, range.finish_at, type ?? "all"] as const;
}

/** List plans for the window, optional type filter. */
export function usePlans(
  user_id: number | undefined,
  range: { start_at: number; finish_at: number },
  type?: ActionType,
) {
  return useQuery<PlanResponse[]>({
    queryKey: planKeys(user_id ?? -1, range, type),
    enabled: !!user_id,
    queryFn: () => listPlans(user_id as number, range, type),
  });
}

/** POST /api/users/{user_id}/plans — builds a plan for a date. */
export function useCreatePlan(user_id: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (plan: PlanRequest) => createPlan(user_id, plan),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["plans", user_id] }),
  });
}

/** Ensure the current profile has a complete plan for the current local week. */
export function useEnsurePlan(
  user_id: number,
  profileKey: string,
  enabled: boolean,
) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const localDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["ensurePlan", user_id, timezone, localDate, profileKey],
    queryFn: () => createPlan(user_id, { timezone }),
    enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: false,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      const grouped = new Map<string, { range: { start_at: number; finish_at: number }; type: ActionType; plans: PlanResponse[] }>();

      for (const plan of query.data) {
        const range = dayRange(new Date(plan.date * 1000));
        const key = `${range.start_at}:${plan.type}`;
        const group = grouped.get(key) ?? { range, type: plan.type, plans: [] };

        group.plans.push(plan);
        grouped.set(key, group);
      }
      for (const group of grouped.values()) {
        qc.setQueryData(planKeys(user_id, group.range, group.type), group.plans);
      }
    }
  }, [query.dataUpdatedAt, query.isSuccess, qc, user_id]);

  return query;
}

/** True while the app's shared ensure-plan request is generating/updating data. */
export function useIsEnsuringPlan(user_id: number) {
  return useIsFetching({ queryKey: ["ensurePlan", user_id] }) > 0;
}

/** Detect a profile-triggered regeneration while the new profile request runs. */
export function useIsRefreshingFuturePlan(user_id: number, profileKey: string) {
  const queryClient = useQueryClient();
  const isEnsuring = useIsEnsuringPlan(user_id);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const localDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const cache = queryClient.getQueryCache().findAll({
    queryKey: ["ensurePlan", user_id],
  });
  const currentQuery = cache.find(
    (query) =>
      query.queryKey[2] === timezone &&
      query.queryKey[3] === localDate &&
      query.queryKey[4] === profileKey,
  );
  const hasPreviousProfileQuery = cache.some(
    (query) =>
      query.queryKey[2] === timezone &&
      query.queryKey[4] !== profileKey,
  );

  return Boolean(
    isEnsuring && currentQuery?.state.fetchStatus === "fetching" && hasPreviousProfileQuery,
  );
}
