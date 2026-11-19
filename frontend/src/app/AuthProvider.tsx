import type { ReactNode } from "react";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { authenticate, logout as apiLogout, restoreSession, setAccessToken, type Account } from "@/api/auth";

type AuthContextValue = {
  account: Account | null;
  restoring: boolean;
  restoreError: boolean;
  retryRestore: () => void;
  signIn: (mode: "login" | "register", username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    void restoreSession()
      .then((value) => {
        if (active) {
          setAccount(value);
          setRestoreError(false);
        }
      })
      .catch(() => {
        if (active) {
          setAccount(null);
          setRestoreError(true);
        }
      })
      .finally(() => {
        if (active) setRestoring(false);
      });

    return () => { active = false; };
  }, [restoreAttempt]);

  useEffect(() => {
    const channel = new BroadcastChannel("daily-energy-auth");
    channel.onmessage = (event) => {
      if (event.data === "logout") {
        setAccessToken(null);
        setAccount(null);
        queryClient.clear();
      }
    };
    const expire = () => {
      setAccessToken(null);
      setAccount(null);
      queryClient.clear();
    };
    window.addEventListener("daily-energy-auth-expired", expire);
    return () => { channel.close(); window.removeEventListener("daily-energy-auth-expired", expire); };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    account, restoring, restoreError,
    retryRestore: () => {
      setRestoreError(false);
      setRestoring(true);
      setRestoreAttempt((attempt) => attempt + 1);
    },
    signIn: async (mode, username, password) => {
      const next = await authenticate(mode, username, password);
      queryClient.clear();
      setRestoreError(false);
      setAccount(next);
    },
    signOut: async () => {
      await apiLogout();
      queryClient.clear();
      setAccount(null);
      const channel = new BroadcastChannel("daily-energy-auth");
      channel.postMessage("logout");
      channel.close();
    },
  }), [account, restoring, restoreError, queryClient]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
