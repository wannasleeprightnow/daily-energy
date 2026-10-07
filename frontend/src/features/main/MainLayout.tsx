import type { ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, m } from "framer-motion";
import { AppShell, NavItem, TabBar } from "@/ui";
import { easings, pageVariants } from "@/ui/motion";
import { apiErrorMessage } from "@/api/client";
import { formatDateWithMonth, nowStartOfDay } from "@/lib/dates";
import { writeDayPick } from "./DayContent";
import {
  CalendarIcon,
  ForkKnifeIcon,
  ChatTabIcon,
  ProfileTabIcon,
} from "@/ui/icons";

interface MainLayoutProps {
  utgid: number;
  planError?: Error | null;
  retryPlan: () => void;
}

/**
 * The main app shell hosting Today/Plan/History/Chat/Profile inside a TabBar
 * (Fig. `сегодня питание` frames). Navigation targets are provided by the
 * child routes; this layout only draws the persistent chrome.
 */
export function MainLayout({ utgid, planError, retryPlan }: MainLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const chatActive = pathname.startsWith("/chat");
  const profileActive = pathname.startsWith("/profile");
  const dateActive = !chatActive && !profileActive;
  const [date, month] = formatDateWithMonth().split(" ");

  /** The date tab always opens the current day, discarding any calendar pick. */
  const openToday = () => {
    writeDayPick(utgid, nowStartOfDay(), "today");
    navigate("/today/food");
  };

  return (
    <AppShell className="pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <AnimatePresence>
        {planError && (
          <m.div
            key="plan-error"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: easings.out } }}
            exit={{ opacity: 0, y: -16, transition: { duration: 0.16, ease: easings.smooth } }}
            className="fixed inset-x-0 top-[max(12px,env(safe-area-inset-top,0px))] z-50 mx-auto w-[calc(100%-2rem)] max-w-[398px] rounded-card bg-[#272727] p-4 text-on shadow-lg" role="alert"
          >
            <p className="min-w-0 break-words text-bodySm text-danger" style={{ overflowWrap: "anywhere" }}>
              {planErrorSummary(planError)}
            </p>
            <button type="button" onClick={retryPlan} className="mt-3 min-h-11 rounded-card bg-accent px-4 text-bodySm font-medium">
              Повторить
            </button>
            <details className="mt-2 text-caption text-on/70">
              <summary className="min-h-11 cursor-pointer content-center">Подробности ошибки</summary>
              <p className="max-h-24 overflow-y-auto break-words whitespace-pre-wrap" style={{ overflowWrap: "anywhere" }}>
                {apiErrorMessage(planError)}
              </p>
            </details>
          </m.div>
        )}
      </AnimatePresence>

      {/* Enter-only page transition keyed by screen (not by Food/Activity tab,
          so toggling the segment keeps the screen mounted and animates only
          the tab indicator + refreshed content). */}
      <m.div
        key={screenKey(pathname)}
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="flex min-h-full flex-1 flex-col"
      >
        <Outlet />
      </m.div>

      <TabBar
        left={
          <button
            type="button"
            aria-label="Открыть сегодняшний день"
            onClick={openToday}
            aria-current={dateActive ? "page" : undefined}
            className="flex min-h-11 min-w-[60px] flex-col items-center justify-center text-[18px] font-medium leading-5"
            style={{ color: dateActive ? "#ffffff" : "#666666" }}
          >
            <span>{date}</span>
            <span>{month}</span>
          </button>
        }
        center={
          <NavItem
            label="Чат"
            icon={<ChatTabIcon />}
            active={chatActive}
            onClick={() => navigate("/chat")}
          />
        }
        right={
          <NavItem
            label="Профиль"
            icon={<ProfileTabIcon />}
            active={profileActive}
            onClick={() => navigate("/profile")}
          />
        }
      />
    </AppShell>
  );
}

/**
 * Stable key for the page transition: the first path segment only, so
 * switching Food ↔ Activity inside a screen does not remount the page
 * (the tab indicator + content animate locally instead).
 */
function screenKey(pathname: string): string {
  return pathname.split("/").slice(0, 2).join("/") || "/";
}

function planErrorSummary(error: Error): string {
  const details = apiErrorMessage(error).toLowerCase();
  if (details.includes("429") || details.includes("rate limit") || details.includes("free-models-per-day")) {
    return "ИИ-сервис временно перегружен или достигнут лимит запросов. Попробуй позже.";
  }
  if (details.includes("timeout") || details.includes("timed out")) {
    return "ИИ-сервис не ответил вовремя. Попробуй ещё раз.";
  }
  return "Не удалось подготовить план. Попробуй ещё раз.";
}

/**
 * The Nutrition ↔ Activity segmented header used on Today/Plan/History.
 * Fig: title fs32 + segmented toggle (Group 9) + a calendar trigger.
 */
export function PlanHeader({
  title,
  kind,
  onKindChange,
}: {
  title: ReactNode;
  kind: "Food" | "Activity";
  onKindChange: (k: "Food" | "Activity") => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="px-5 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-h1 text-on">{title}</h1>
        <button
          type="button"
          aria-label="Календарь"
          onClick={() => navigate("/calendar")}
          className="flex h-11 w-11 items-center justify-center"
        >
          <CalendarIcon size={26} color="#f08629" />
        </button>
      </div>

      <SegmentedTabs value={kind} onChange={onKindChange} />
    </div>
  );
}

function SegmentedTabs({
  value,
  onChange,
}: {
  value: "Food" | "Activity";
  onChange: (k: "Food" | "Activity") => void;
}) {
  const items = [
    { value: "Food" as const, label: "Питание", Icon: ForkKnifeIcon },
    { value: "Activity" as const, label: "Активность", Icon: null },
  ];
  return (
    <div className="inline-flex rounded-card bg-surface p-1">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(it.value)}
            className={`flex min-h-10 min-w-11 items-center justify-center gap-2 rounded-card border px-4 text-bodySm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              active
                ? "border-accent bg-transparent text-on shadow-[0_0_6px_rgba(240,134,41,0.4)]"
                : "border-transparent bg-transparent text-on"
            }`}
          >
            {it.Icon && <it.Icon size={20} color="currentColor" />}
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
