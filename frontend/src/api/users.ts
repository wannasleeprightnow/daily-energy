import { http } from "./client";
import type {
  UserCreate,
  UserResponse,
  UserRequest,
  UserWeightHistoryResponse,
  UserWeightHistoryRequest,
} from "./types";

/** POST /api/users — create a new user. */
export async function createUser(
  user: UserCreate,
): Promise<UserResponse> {
  const { data } = await http.post<UserResponse>("/api/users", user);
  return data;
}

/** GET /api/users/{utgid} — fetch a user by Telegram id. */
export async function getUser(utgid: number): Promise<UserResponse> {
  const { data } = await http.get<UserResponse>(`/api/users/${utgid}`);
  return data;
}

/** PUT /api/users/{utgid} — update user profile. */
export async function updateUser(
  utgid: number,
  patch: UserRequest,
): Promise<UserResponse> {
  const { data } = await http.put<UserResponse>(`/api/users/${utgid}`, patch);
  return data;
}

/** DELETE /api/users/{utgid} — delete a user. */
export async function deleteUser(utgid: number): Promise<void> {
  await http.delete(`/api/users/${utgid}`);
}

/** GET /api/users/{utgid}/weight-history */
export async function getWeightHistory(
  utgid: number,
): Promise<UserWeightHistoryResponse[]> {
  const { data } = await http.get<UserWeightHistoryResponse[]>(
    `/api/users/${utgid}/weight-history`,
  );
  return data;
}

/** POST /api/users/{utgid}/weight-history */
export async function addWeightEntry(
  utgid: number,
  entry: UserWeightHistoryRequest,
): Promise<UserWeightHistoryResponse> {
  const { data } = await http.post<UserWeightHistoryResponse>(
    `/api/users/${utgid}/weight-history`,
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