import type { ReactNode } from "react";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { MotionProvider } from "@/ui/motion";
import { setAuthHeader } from "@/api/client";
import { getInitData } from "@/lib/telegram";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Attach the Telegram auth header once at bootstrap. */
function initAuth() {
  const initData = getInitData();

  if (initData) setAuthHeader(initData);
}

/**
 * App-wide providers: React Query, and initialises the auth header from
 * Telegram. Children render only after auth is primed.
 */
export function Provider({ children }: { children: ReactNode }) {
  initAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <MotionProvider>{children}</MotionProvider>
    </QueryClientProvider>
  );
}