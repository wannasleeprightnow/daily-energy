import type { ReactNode } from "react";
import { AppShell, Button, OnboardingProgressBar } from "@/ui";
import { colors } from "@/design/tokens";

interface OnboardingLayoutProps {
  /** Current step index (0-based). */
  step: number;
  total: number;
  title: string;
  onBack?: () => void;
  onNext?: () => void;
  canContinue?: boolean;
  children: ReactNode;
  /** Show the back arrow (all steps except the first support going back). */
  showBack?: boolean;
}

/**
 * Shared frame for all onboarding steps.
 * Figma `рега` frames: back arrow 20×20 at top-left, progress bar at top,
 * title fs32, then the control, then an orange "→" pill bottom-right.
 */
export function OnboardingLayout({
  step,
  total,
  title,
  onBack,
  onNext,
  canContinue = true,
  children,
  showBack = false,
}: OnboardingLayoutProps) {
  return (
    <AppShell className="flex-col px-5 safe-bottom">
      {/* top row: back arrow + progress bar */}
      <div className="flex items-center gap-3 pt-5">
        {showBack && onBack ? (
          <button
            type="button"
            aria-label="Назад"
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-on"
          >
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
              <path
                d="M12.5 4.5 7 10l5.5 5.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <div className="w-11" />
        )}
        <OnboardingProgressBar value={step + 1} total={total} className="flex-1" />
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col items-center px-1 pt-10"
        style={{ color: colors.on }}
      >
        <h1 className="mb-10 text-center text-h1">{title}</h1>
        <div className="flex w-full max-w-[340px] flex-col gap-4">
          {children}
        </div>
      </div>

      {/* next/continue pill */}
      {onNext && (
        <div className="flex justify-end pb-8">
          <Button
            onClick={onNext}
            disabled={!canContinue}
            aria-label="Далее"
            className="h-[57px] w-[66px] text-h2"
          >
            →
          </Button>
        </div>
      )}
    </AppShell>
  );
}