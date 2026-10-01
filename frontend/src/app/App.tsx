import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Spinner, Text } from "@/ui";
import { useUser } from "@/hooks/useUser";
import { getTgId, getTgUser, setHeaderColor } from "@/lib/telegram";
import { colors } from "@/design/tokens";

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

function AppRoutes({ utgid }: { utgid: number }) {
  return (
    <Routes>
      <Route element={<MainLayout utgid={utgid} />}>
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
  const { data: user, isLoading, isError } = useUser(tgId);

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 text-on"
        style={{ height: "100dvh", backgroundColor: colors.bg }}
      >
        <Spinner size={40} />
        <Text kind="subtitle">Загружаем твой профиль…</Text>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 px-8 text-center text-on"
        style={{ height: "100dvh", backgroundColor: colors.bg }}
      >
        <Text kind="title">Что-то пошло не так</Text>
        <Text kind="subtitle">
          Не удалось получить профиль. Проверь соединение и попробуй ещё раз.
        </Text>
      </div>
    );
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

  return <AppRoutes utgid={tgId} />;
}
