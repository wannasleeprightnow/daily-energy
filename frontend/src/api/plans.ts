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

/** GET /api/users/{utgid}/actions */
export async function listActions(
  utgid: number,
  range: ListRange,
  type?: ActionType,
): Promise<ActionResponse[]> {
  const { data } = await http.get<ActionResponse[]>(
    `/api/users/${utgid}/actions`,
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

/** POST /api/users/{utgid}/actions */
export async function createAction(
  utgid: number,
  action: ActionRequest,
): Promise<ActionResponse> {
  const { data } = await http.post<ActionResponse>(
    `/api/users/${utgid}/actions`,
    action,
  );

  return data;
}

/** GET /api/actions/{id} */
export async function getAction(id: string): Promise<ActionResponse> {
  const { data } = await http.get<ActionResponse>(`/api/actions/${id}`);

  return data;
}

/** GET /api/users/{utgid}/plans */
export async function listPlans(
  utgid: number,
  range: ListRange,
  type?: ActionType,
): Promise<PlanResponse[]> {
  const { data } = await http.get<PlanResponse[]>(`/api/users/${utgid}/plans`, {
    params: {
      start_at: range.start_at,
      finish_at: range.finish_at,
      ...(type ? { type } : {}),
    },
  });

  return data;
}

/** POST /api/users/{utgid}/plans — idempotently ensures the seven-day horizon. */
export async function createPlan(
  utgid: number,
  plan: PlanRequest,
): Promise<PlanResponse[]> {
  const { data } = await http.post<PlanResponse[]>(
    `/api/users/${utgid}/plans`,
    plan,
    { timeout: 170_000 },
  );

  return data;
}
