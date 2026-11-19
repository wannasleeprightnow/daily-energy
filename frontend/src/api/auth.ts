import axios from "axios";

import { API_URL } from "@/constants";

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let refreshPromise: Promise<string | null> | null = null;
let authGeneration = 0;

export interface Account { id: number; username: string }
interface TokenResponse { access_token: string; expires_in: number; account?: Account }

export function getAccessToken() {
  if (accessToken && Date.now() >= accessTokenExpiresAt - 15_000) {
    accessToken = null;
    accessTokenExpiresAt = 0;
  }
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (!token) accessTokenExpiresAt = 0;
}

export async function authenticate(
  mode: "login" | "register",
  username: string,
  password: string,
): Promise<Account> {
  const { data } = await client.post<TokenResponse>(`/api/auth/${mode}`, { username, password });
  authGeneration++;
  accessToken = data.access_token;
  accessTokenExpiresAt = Date.now() + data.expires_in * 1000;
  return data.account ?? getAccount();
}

async function getAccount(): Promise<Account> {
  const { data } = await client.get<Account>("/api/auth/me", { headers: { Authorization: `Bearer ${accessToken}` } });
  return data;
}

export async function restoreSession(): Promise<Account | null> {
  const token = await refreshAccessToken();
  if (!token) return null;
  try {
    return await getAccount();
  } catch {
    accessToken = null;
    throw new Error("Не удалось восстановить сессию");
  }
}

export async function refreshAccessToken(force = false): Promise<string | null> {
  if (!refreshPromise) {
    const rotate = async () => {
      if (accessToken && !force) return accessToken;
      const generation = authGeneration;
      try {
        const { data } = await client.post<TokenResponse>("/api/auth/refresh");
        if (generation !== authGeneration) return null;
        accessToken = data.access_token;
        accessTokenExpiresAt = Date.now() + data.expires_in * 1000;
        return accessToken;
      } catch (error) {
        if (generation !== authGeneration) return null;
        accessToken = null;
        accessTokenExpiresAt = 0;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (typeof window !== "undefined") window.dispatchEvent(new Event("daily-energy-auth-expired"));
          return null;
        }
        throw error;
      }
    };
    refreshPromise = (navigator.locks
      ? navigator.locks.request("daily-energy-refresh", rotate)
      : rotate()).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function logout(): Promise<void> {
  authGeneration++;
  const endSession = async () =>
    client.post("/api/auth/logout", null, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  try {
    await (navigator.locks
      ? navigator.locks.request("daily-energy-refresh", endSession)
      : endSession());
  } finally {
    accessToken = null;
    accessTokenExpiresAt = 0;
  }
}

export const authHttp = axios.create({ baseURL: API_URL, timeout: 20000 });
authHttp.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
authHttp.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as
      | (NonNullable<typeof error.config> & { _authRetried?: boolean })
      | undefined;

    if (
      error.response?.status !== 401 ||
      !config ||
      config._authRetried ||
      config.url?.includes("/auth/")
    ) {
      throw error;
    }
    config._authRetried = true;
    const token = await refreshAccessToken(true);

    if (!token) throw error;
    config.headers.Authorization = `Bearer ${token}`;

    return authHttp.request(config);
  },
);
