/**
 * Types transcribed from `backend/api/openapi/openapi.yml`.
 * The OpenAPI file is the source of truth; update these if it changes.
 */

export type Gender = "Male" | "Female";
export type Goal = "LoseWeight" | "Maintain" | "GainMuscleMass";
export type PhysicalActivity = "Low" | "Medium" | "High";
export type ActionType = "Food" | "Activity";

export interface UserResponse {
  utgid: number;
  gender: Gender;
  date_of_birth: number;
  weight: number;
  height: number;
  goal: Goal;
  physical_activity: PhysicalActivity;
  name: string;
}

export type UserCreate = Required<UserResponse>;

export interface UserRequest {
  name: string;
  gender: Gender;
  date_of_birth: number;
  weight: number;
  height: number;
  goal: Goal;
  physical_activity: PhysicalActivity;
}

export interface UserWeightHistoryResponse {
  utgid: number;
  date: number;
  weight: number;
  height: number;
}

export interface UserWeightHistoryRequest {
  date: number;
  weight: number;
  height: number;
}

export interface PlanResponse {
  id: string;
  utgid: number;
  date: number;
  calories_to_consume: number;
  calories_to_burn: number;
  recommendation: string;
  type: ActionType;
}

export interface PlanRequest {
  date: number;
}

export interface ActionResponse {
  id: string;
  utgid: number;
  date: number;
  activity_name: string;
  calories: number;
  type: ActionType;
}

export interface ActionRequest {
  date: number;
  activity_name: string;
  calories: number;
  type: ActionType;
}

export interface CaloriesRequest {
  title: string;
}

export interface CaloriesResponse {
  calories: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

/** Payload collected during onboarding (POST /api/users). */
export type OnboardingProfile = Omit<UserCreate, "utgid">;