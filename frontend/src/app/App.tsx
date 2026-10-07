import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { AppShell, Button, Text } from "@/ui";
import { springs } from "@/ui/motion";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUser";
import { getTgId, getTgUser, setHeaderColor } from "@/lib/telegram";
import { colors } from "@/design/tokens";
import { actionKeys } from "@/hooks/useActions";
import { planKeys } from "@/hooks/usePlans";
import { queryKeys } from "@/hooks/useUser";
import { listActions, listPlans } from "@/api/plans";
import { getWeightHistory } from "@/api/users";
import type { ActionType, PlanResponse } from "@/api/types";
import { dayRange, nowStartOfDay } from "@/lib/dates";

import { GreetPage } from "@/features/onboarding/GreetPage";
import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import { MainLayout } from "@/features/main/MainLayout";
import { TodayPage } from "@/features/main/TodayPage";
import { PlanPage } from "@/features/plan/PlanPage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { ChatPage } from "@/features/ai-chat/ChatPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { EditProfilePage } from "@/features/profile/EditProfilePage";
import { CalendarPage } from "@/features/profile/CalendarPage";
import { useEnsurePlan } from "@/hooks/usePlans";

function AppRoutes({
  utgid,
  planError,
  retryPlan,
}: {
  utgid: number;
  planError?: Error | null;
  retryPlan: () => void;
}) {
  return (
      <Routes>
        <Route element={<MainLayout utgid={utgid} planError={planError} retryPlan={retryPlan} />}>
          <Route index element={<Navigate to="today/food" replace />} />
          <Route path="today/:kind" element={<TodayPage utgid={utgid} />} />
          <Route path="plan/:kind" element={<PlanPage utgid={utgid} />} />
          <Route path="history/:kind" element={<HistoryPage utgid={utgid} />} />
          <Route path="calendar" element={<CalendarPage utgid={utgid} />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage utgid={utgid} />} />
          <Route path="profile/edit" element={<EditProfilePage utgid={utgid} />} />
          <Route path="*" element={<Navigate to="today/food" replace />} />
        </Route>
      </Routes>
  );
}

/**
 * Root component: resolves the onboarding / main decision.
 *  - No Telegram user  -> Greet page (landing).
 *  - User, no record   -> Greet page, then onboarding wizard.
 *  - User + record     -> Main app shell.
 */
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const tgId = getTgId();
  const tgUser = getTgUser();

  useEffect(() => {
    setHeaderColor(colors.bg);
    if (!tgUser && location.pathname !== "/") {
      void navigate("/", { replace: true });
    }
  }, [tgUser, location.pathname, navigate]);

  if (!tgUser || tgId === null) {
    return (
      <Routes>
        <Route path="*" element={<GreetPage />} />
      </Routes>
    );
  }

  return <UserGate tgId={tgId} name={tgUser.first_name} />;
}

function UserGate({ tgId, name }: { tgId: number; name?: string }) {
  const { data: user, isLoading, isError, refetch } = useUser(tgId);
  const profileKey = user
    ? JSON.stringify([user.gender, user.date_of_birth, user.weight, user.height, user.goal, user.physical_activity])
    : "";
  const planQuery = useEnsurePlan(tgId, profileKey, !!user);
  const warmup = useStartupWarmup(tgId, !!user);

  if (isLoading) {
    return <GreetPage showGo={false} />;
  }

  if (isError) {
    return <StartupError message="Не удалось получить профиль. Проверь соединение и попробуй ещё раз." retry={() => void refetch()} />;
  }

  if (!user) {
    return (
      <Routes>
        <Route
          path="/onboarding"
          element={<OnboardingPage tgId={tgId} name={name} />}
        />
        <Route path="*" element={<GreetPage />} />
      </Routes>
    );
  }

  if (!warmup.ready) {
    if (warmup.error) {
      return <StartupError message="Не удалось загрузить данные. Проверь соединение и попробуй ещё раз." retry={warmup.retry} />;
    }
    return <GreetPage showGo={false} />;
  }

  return <AppRoutes utgid={tgId} planError={planQuery.error} retryPlan={() => void planQuery.refetch()} />;
}

function StartupError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <AppShell className="relative px-6">
      <div className="flex min-h-full flex-1 flex-col items-center justify-center text-center" style={{ backgroundColor: colors.bg }}>
        <m.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.soft}
          className="flex flex-col items-center"
        >
          <Text kind="title" className="mb-2">Не удалось открыть приложение</Text>
          <Text kind="subtitle" className="max-w-[280px]">{message}</Text>
          <Button onClick={retry} className="mt-8 px-8 py-3">Повторить</Button>
        </m.div>
      </div>
    </AppShell>
  );
}

/** Warm the exact query ranges used by the day and profile tabs before revealing the app. */
function useStartupWarmup(utgid: number, enabled: boolean) {
  const queryClient = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ ready: boolean; error: boolean }>({ ready: false, error: false });

  useEffect(() => {
    if (!enabled) {
      setState({ ready: true, error: false });
      return;
    }

    let cancelled = false;
    setState({ ready: false, error: false });
    const today = nowStartOfDay();
    const todayRange = dayRange(today);
    const lastPlanDay = new Date(today);
    lastPlanDay.setDate(lastPlanDay.getDate() + 6);
    const planHorizon = {
      start_at: todayRange.start_at,
      finish_at: dayRange(lastPlanDay).finish_at,
    };
    const chartStart = new Date(today);
    chartStart.setDate(chartStart.getDate() - 6);
    const chartRange = {
      start_at: dayRange(chartStart).start_at,
      finish_at: todayRange.finish_at,
    };
    const types: ActionType[] = ["Food", "Activity"];

    const warmBackgroundData = () => {
      void Promise.allSettled([
        queryClient.fetchQuery({
          queryKey: queryKeys.weightHistory(utgid),
          queryFn: async () => {
            const history = (await getWeightHistory(utgid)) ?? [];
            return history.sort((a, b) => a.date - b.date);
          },
        }),
        queryClient.fetchQuery({
          queryKey: actionKeys(utgid, chartRange),
          queryFn: () => listActions(utgid, chartRange),
        }),
      ]);
    };

    void Promise.all([
      ...types.map((type) => queryClient.fetchQuery({
        queryKey: actionKeys(utgid, todayRange, type),
        queryFn: () => listActions(utgid, todayRange, type),
      })),
      queryClient.fetchQuery({
        queryKey: ["startupPlanWarmup", utgid, planHorizon.start_at, planHorizon.finish_at],
        queryFn: () => listPlans(utgid, planHorizon),
      }).then((plans) => {
        for (let offset = 0; offset < 7; offset += 1) {
          const date = new Date(today);
          date.setDate(date.getDate() + offset);
          const range = dayRange(date);
          for (const type of types) {
            const dayPlans = plans.filter((plan) =>
              plan.type === type && plan.date >= range.start_at && plan.date <= range.finish_at,
            );
            queryClient.setQueryData<PlanResponse[]>(planKeys(utgid, range, type), dayPlans);
          }
        }
      }),
    ]).then(() => {
      if (cancelled) return;
      warmBackgroundData();
      setState({ ready: true, error: false });
    }).catch(() => {
      if (!cancelled) setState({ ready: false, error: true });
    });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled, queryClient, utgid]);

  return {
    ...state,
    retry: () => setAttempt((current) => current + 1),
  };
}
