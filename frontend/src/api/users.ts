import type {
  UserCreate,
  UserResponse,
  UserRequest,
  UserWeightHistoryResponse,
  UserWeightHistoryRequest,
} from "./types";

import { http } from "./client";

/** POST /api/users — create a new user. */
export async function createUser(
  user: UserCreate,
): Promise<UserResponse> {
  const { data } = await http.post<UserResponse>("/api/users", user);

  return data;
}

/** GET /api/users/{user_id} — fetch the authenticated account's profile. */
export async function getUser(user_id: number): Promise<UserResponse> {
  const { data } = await http.get<UserResponse>(`/api/users/${user_id}`);

  return data;
}

/** PUT /api/users/{user_id} — update user profile. */
export async function updateUser(
  user_id: number,
  patch: UserRequest,
): Promise<UserResponse> {
  const { data } = await http.put<UserResponse>(`/api/users/${user_id}`, patch);

  return data;
}

/** DELETE /api/users/{user_id} — delete a user. */
export async function deleteUser(user_id: number): Promise<void> {
  await http.delete(`/api/users/${user_id}`);
}

/** GET /api/users/{user_id}/weight-history */
export async function getWeightHistory(
  user_id: number,
): Promise<UserWeightHistoryResponse[]> {
  const { data } = await http.get<UserWeightHistoryResponse[]>(
    `/api/users/${user_id}/weight-history`,
  );

  return data;
}

/** POST /api/users/{user_id}/weight-history */
export async function addWeightEntry(
  user_id: number,
  entry: UserWeightHistoryRequest,
): Promise<UserWeightHistoryResponse> {
  const { data } = await http.post<UserWeightHistoryResponse>(
    `/api/users/${user_id}/weight-history`,
    entry,
  );

  return data;
}

/** Does a 404 mean "no user yet"? */
export function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { response?: { status?: number } }).response?.status;

  return status === 404;
}

/** Is a 409 "user already exists"? */
export function isConflict(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { response?: { status?: number } }).response?.status;

  return status === 409;
}
