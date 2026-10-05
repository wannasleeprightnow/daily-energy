import { useEffect } from "react";
import { useIsFetching, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/** Ensure the current profile has a complete plan for the current local week. */
export function useEnsurePlan(
  utgid: number,
  profileKey: string,
  enabled: boolean,
) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const localDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["ensurePlan", utgid, timezone, localDate, profileKey],
    queryFn: () => createPlan(utgid, { timezone }),
    enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: false,
  });
  useEffect(() => {
    if (query.isSuccess) {
      void qc.invalidateQueries({ queryKey: ["plans", utgid] });
    }
  }, [query.dataUpdatedAt, query.isSuccess, qc, utgid]);
  return query;
}

/** True while the app's shared ensure-plan request is generating/updating data. */
export function useIsEnsuringPlan(utgid: number) {
  return useIsFetching({ queryKey: ["ensurePlan", utgid] }) > 0;
}

/** Detect a profile-triggered regeneration while the new profile request runs. */
export function useIsRefreshingFuturePlan(utgid: number, profileKey: string) {
  const queryClient = useQueryClient();
  const isEnsuring = useIsEnsuringPlan(utgid);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const localDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const cache = queryClient.getQueryCache().findAll({
    queryKey: ["ensurePlan", utgid],
  });
  const currentQuery = cache.find(
    (query) =>
      query.queryKey[2] === timezone &&
      query.queryKey[3] === localDate &&
      query.queryKey[4] === profileKey,
  );
  const hasPreviousProfilePlan = cache.some(
    (query) =>
      query.queryKey[2] === timezone &&
      query.queryKey[4] !== profileKey &&
      query.state.status === "success",
  );
  return Boolean(
    isEnsuring && currentQuery?.state.fetchStatus === "fetching" && hasPreviousProfilePlan,
  );
}
