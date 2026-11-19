import type {
  ActionType,
  ActionRequest,
  ActionResponse,
  PlanRequest,
  PlanResponse,
} from "./types";

import { http } from "./client";

export interface ListRange {
  start_at: number;
  finish_at: number;
}

/** GET /api/users/{user_id}/actions */
export async function listActions(
  user_id: number,
  range: ListRange,
  type?: ActionType,
): Promise<ActionResponse[]> {
  const { data } = await http.get<ActionResponse[]>(
    `/api/users/${user_id}/actions`,
    {
      params: {
        start_at: range.start_at,
        finish_at: range.finish_at,
        ...(type ? { type } : {}),
      },
    },
  );

  return data;
}

/** POST /api/users/{user_id}/actions */
export async function createAction(
  user_id: number,
  action: ActionRequest,
): Promise<ActionResponse> {
  const { data } = await http.post<ActionResponse>(
    `/api/users/${user_id}/actions`,
    action,
  );

  return data;
}

/** GET /api/actions/{id} */
export async function getAction(id: string): Promise<ActionResponse> {
  const { data } = await http.get<ActionResponse>(`/api/actions/${id}`);

  return data;
}

/** GET /api/users/{user_id}/plans */
export async function listPlans(
  user_id: number,
  range: ListRange,
  type?: ActionType,
): Promise<PlanResponse[]> {
  const { data } = await http.get<PlanResponse[]>(`/api/users/${user_id}/plans`, {
    params: {
      start_at: range.start_at,
      finish_at: range.finish_at,
      ...(type ? { type } : {}),
    },
  });

  return data;
}

/** POST /api/users/{user_id}/plans — idempotently ensures the seven-day horizon. */
export async function createPlan(
  user_id: number,
  plan: PlanRequest,
): Promise<PlanResponse[]> {
  const { data } = await http.post<PlanResponse[]>(
    `/api/users/${user_id}/plans`,
    plan,
    { timeout: 170_000 },
  );

  return data;
}
