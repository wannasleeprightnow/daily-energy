import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/app/AuthProvider";
import { useUser } from "@/hooks/useUser";
import { getPlanProfileKey } from "@/lib/profile";
import { useStartupWarmup } from "@/hooks/useStartupWarmup";
import { useEnsurePlan } from "@/hooks/usePlans";
import { AppRoutes } from "@/app/AppRoutes";
import { StartupError } from "@/app/StartupError";
import { AuthPage } from "@/features/auth/AuthPage";
import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import { GreetPage } from "@/features/onboarding/GreetPage";

export default function App() {
  const { account, restoring, restoreError, retryRestore } = useAuth();
  if (restoring) return <GreetPage showGo={false} />;
  if (restoreError) return <StartupError message="Не удалось восстановить сессию. Проверь соединение и попробуй ещё раз." retry={retryRestore} />;
  if (!account) return <Routes>
    <Route element={<AuthPage mode="login" />} path="/login" />
    <Route element={<AuthPage mode="register" />} path="/register" />
    <Route element={<Navigate replace to="/login" />} path="*" />
  </Routes>;
  return <AccountGate accountId={account.id} />;
}

function AccountGate({ accountId }: { accountId: number }) {
  const { data: user, isLoading, isError, refetch } = useUser(accountId);
  const profileKey = getPlanProfileKey(user);
  const planQuery = useEnsurePlan(accountId, profileKey, !!user);
  const warmup = useStartupWarmup(accountId, !!user);
  if (isLoading) return <GreetPage showGo={false} />;
  if (isError) return <StartupError message="Не удалось получить профиль. Проверь соединение и попробуй ещё раз." retry={() => void refetch()} />;
  if (!user) return <Routes>
    <Route element={<OnboardingPage />} path="/onboarding" />
    <Route element={<Navigate replace to="/onboarding" />} path="*" />
  </Routes>;
  if (!warmup.ready) {
    if (warmup.error) return <StartupError message="Не удалось загрузить данные. Проверь соединение и попробуй ещё раз." retry={warmup.retry} />;
    return <GreetPage showGo={false} />;
  }
  return <AppRoutes planError={planQuery.error} retryPlan={() => void planQuery.refetch()} user_id={accountId} />;
}
