import type { ReactNode } from "react";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { MotionProvider } from "@/ui/motion";
import { AuthProvider } from "@/app/AuthProvider";

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

/** App-wide query, motion, and browser-session providers. */
export function Provider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider><MotionProvider>{children}</MotionProvider></AuthProvider>
    </QueryClientProvider>
  );
}
