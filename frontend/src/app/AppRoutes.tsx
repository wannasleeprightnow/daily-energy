import { Navigate, Route, Routes } from "react-router-dom";

import { MainLayout } from "@/features/main/MainLayout";
import { TodayPage } from "@/features/main/TodayPage";
import { PlanPage } from "@/features/plan/PlanPage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { ChatPage } from "@/features/ai-chat/ChatPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { EditProfilePage } from "@/features/profile/EditProfilePage";
import { CalendarPage } from "@/features/profile/CalendarPage";

interface AppRoutesProps {
  utgid: number;
  planError?: Error | null;
  retryPlan: () => void;
}

export function AppRoutes({ utgid, planError, retryPlan }: AppRoutesProps) {
  return (
    <Routes>
      <Route element={<MainLayout planError={planError} retryPlan={retryPlan} utgid={utgid} />}>
        <Route index element={<Navigate replace to="today/food" />} />
        <Route element={<TodayPage utgid={utgid} />} path="today/:kind" />
        <Route element={<PlanPage utgid={utgid} />} path="plan/:kind" />
        <Route element={<HistoryPage utgid={utgid} />} path="history/:kind" />
        <Route element={<CalendarPage utgid={utgid} />} path="calendar" />
        <Route element={<ChatPage />} path="chat" />
        <Route element={<ProfilePage utgid={utgid} />} path="profile" />
        <Route element={<EditProfilePage utgid={utgid} />} path="profile/edit" />
        <Route element={<Navigate replace to="today/food" />} path="*" />
      </Route>
    </Routes>
  );
}
