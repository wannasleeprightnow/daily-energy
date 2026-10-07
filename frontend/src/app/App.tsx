import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { useUser } from "@/hooks/useUser";
import { getTgId, getTgUser, setHeaderColor } from "@/lib/telegram";
import { colors } from "@/design/tokens";
import { getPlanProfileKey } from "@/lib/profile";
import { useStartupWarmup } from "@/hooks/useStartupWarmup";
import { useEnsurePlan } from "@/hooks/usePlans";
import { AppRoutes } from "@/app/AppRoutes";
import { StartupError } from "@/app/StartupError";
import { GreetPage } from "@/features/onboarding/GreetPage";
import { OnboardingPage } from "@/features/onboarding/OnboardingPage";

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
  const avatarUrl = tgUser?.photo_url?.trim() ?? "";

  useEffect(() => {
    setHeaderColor(colors.bg);
    if (!tgUser && location.pathname !== "/") {
      void navigate("/", { replace: true });
    }
  }, [tgUser, location.pathname, navigate]);

  // Warm the browser cache with the Telegram avatar while the loading screen
  // is up, so the profile renders it instantly instead of popping in later.
  useEffect(() => {
    if (!avatarUrl) return;
    const img = new Image();

    img.decoding = "async";
    img.src = avatarUrl;
  }, [avatarUrl]);

  if (!tgUser || tgId === null) {
    return (
      <Routes>
        <Route element={<GreetPage />} path="*" />
      </Routes>
    );
  }

  return <UserGate name={tgUser.first_name} tgId={tgId} />;
}

function UserGate({ tgId, name }: { tgId: number; name?: string }) {
  const { data: user, isLoading, isError, refetch } = useUser(tgId);
  const profileKey = getPlanProfileKey(user);
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
          element={<OnboardingPage name={name} tgId={tgId} />}
          path="/onboarding"
        />
        <Route element={<GreetPage />} path="*" />
      </Routes>
    );
  }

  if (!warmup.ready) {
    if (warmup.error) {
      return <StartupError message="Не удалось загрузить данные. Проверь соединение и попробуй ещё раз." retry={warmup.retry} />;
    }

    return <GreetPage showGo={false} />;
  }

  return <AppRoutes planError={planQuery.error} retryPlan={() => void planQuery.refetch()} utgid={tgId} />;
}
