import { http } from "./client";
import type { CaloriesRequest, CaloriesResponse } from "./types";

/** POST /api/ai/calories — estimate the calorie count for a food title. */
export async function estimateCalories(
  req: CaloriesRequest,
): Promise<CaloriesResponse> {
  const { data } = await http.post<CaloriesResponse>("/api/ai/calories", req);
  return data;
}