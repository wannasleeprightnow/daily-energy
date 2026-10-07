import type {
  ActivityCaloriesRequest,
  CaloriesRequest,
  CaloriesResponse,
} from "./types";

import { http } from "./client";

/** POST /api/ai/calories — estimate the calorie count for a food title. */
export async function estimateCalories(
  req: CaloriesRequest,
): Promise<CaloriesResponse> {
  const { data } = await http.post<CaloriesResponse>("/api/ai/calories", req);

  return data;
}

/** POST /api/ai/activity-calories — approximate calories for an activity session. */
export async function estimateActivityCalories(
  req: ActivityCaloriesRequest,
): Promise<CaloriesResponse> {
  const { data } = await http.post<CaloriesResponse>(
    "/api/ai/activity-calories",
    req,
  );

  return data;
}
