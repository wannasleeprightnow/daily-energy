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
  user_id: number;
  planError?: Error | null;
  retryPlan: () => void;
}

export function AppRoutes({ user_id, planError, retryPlan }: AppRoutesProps) {
  return (
    <Routes>
      <Route element={<MainLayout planError={planError} retryPlan={retryPlan} user_id={user_id} />}>
        <Route index element={<Navigate replace to="today/food" />} />
        <Route element={<TodayPage user_id={user_id} />} path="today/:kind" />
        <Route element={<PlanPage user_id={user_id} />} path="plan/:kind" />
        <Route element={<HistoryPage user_id={user_id} />} path="history/:kind" />
        <Route element={<CalendarPage user_id={user_id} />} path="calendar" />
        <Route element={<ChatPage />} path="chat" />
        <Route element={<ProfilePage user_id={user_id} />} path="profile" />
        <Route element={<EditProfilePage user_id={user_id} />} path="profile/edit" />
        <Route element={<Navigate replace to="today/food" />} path="*" />
      </Route>
    </Routes>
  );
}
