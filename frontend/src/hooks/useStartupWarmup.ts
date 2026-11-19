import type { ActionType, PlanResponse } from "@/api/types";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { listActions, listPlans } from "@/api/plans";
import { getWeightHistory } from "@/api/users";
import { actionKeys } from "@/hooks/useActions";
import { planKeys } from "@/hooks/usePlans";
import { queryKeys } from "@/hooks/useUser";
import { dayRange, nowStartOfDay } from "@/lib/dates";

interface WarmupResult {
  requestKey: string;
  ready: boolean;
  error: boolean;
}

/** Prefetch data shared by the initial day, plan, and profile views. */
export function useStartupWarmup(user_id: number, enabled: boolean) {
  const queryClient = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${user_id}:${attempt}`;
  const [result, setResult] = useState<WarmupResult>({
    requestKey: "",
    ready: false,
    error: false,
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const today = nowStartOfDay();
    const todayRange = dayRange(today);
    const lastPlanDay = new Date(today);

    lastPlanDay.setDate(lastPlanDay.getDate() + 6);
    const planHorizon = {
      start_at: todayRange.start_at,
      finish_at: dayRange(lastPlanDay).finish_at,
    };
    const chartStart = new Date(today);

    chartStart.setDate(chartStart.getDate() - 6);
    const chartRange = {
      start_at: dayRange(chartStart).start_at,
      finish_at: todayRange.finish_at,
    };
    const types: ActionType[] = ["Food", "Activity"];

    const warmBackgroundData = () => {
      void Promise.allSettled([
        queryClient.fetchQuery({
          queryKey: queryKeys.weightHistory(user_id),
          queryFn: async () => {
            const history = (await getWeightHistory(user_id)) ?? [];

            return history.sort((a, b) => a.date - b.date);
          },
        }),
        queryClient.fetchQuery({
          queryKey: actionKeys(user_id, chartRange),
          queryFn: () => listActions(user_id, chartRange),
        }),
      ]);
    };

    void Promise.all([
      ...types.map((type) => queryClient.fetchQuery({
        queryKey: actionKeys(user_id, todayRange, type),
        queryFn: () => listActions(user_id, todayRange, type),
      })),
      queryClient.fetchQuery({
        queryKey: ["startupPlanWarmup", user_id, planHorizon.start_at, planHorizon.finish_at],
        queryFn: () => listPlans(user_id, planHorizon),
      }).then((plans) => {
        for (let offset = 0; offset < 7; offset += 1) {
          const date = new Date(today);

          date.setDate(date.getDate() + offset);
          const range = dayRange(date);

          for (const type of types) {
            const dayPlans = plans.filter((plan) =>
              plan.type === type && plan.date >= range.start_at && plan.date <= range.finish_at,
            );

            queryClient.setQueryData<PlanResponse[]>(planKeys(user_id, range, type), dayPlans);
          }
        }
      }),
    ]).then(() => {
      if (cancelled) return;
      warmBackgroundData();
      setResult({ requestKey, ready: true, error: false });
    }).catch(() => {
      if (!cancelled) setResult({ requestKey, ready: false, error: true });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, queryClient, requestKey, user_id]);

  return {
    ready: !enabled || (result.requestKey === requestKey && result.ready),
    error: enabled && result.requestKey === requestKey && result.error,
    retry: () => setAttempt((current) => current + 1),
  };
}
