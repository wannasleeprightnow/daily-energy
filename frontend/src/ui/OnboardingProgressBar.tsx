import clsx from "clsx";

interface OnboardingProgressBarProps {
  /** Number of completed steps (0..total). */
  value: number;
  total: number;
  className?: string;
}

/**
 * Thin step bar at the top of onboarding screens.
 * Fig: track 300×12 r20 `#4a4a4a`; fill `#f08629`, width proportional to steps.
 */
export function OnboardingProgressBar({
  value,
  total,
  className,
}: OnboardingProgressBarProps) {
  const progress = Math.max(0, Math.min(1, value / total));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      className={clsx(
        "relative h-3 w-full rounded-pill bg-surface2",
        className,
      )}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-pill bg-accent transition-all"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}