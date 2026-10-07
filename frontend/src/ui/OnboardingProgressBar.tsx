import { m } from "framer-motion";
import clsx from "clsx";
import { springs } from "./motion";

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
      {/* Fill animates via scaleX (transform-only, no layout cost); the
          origin stays on the left so the bar grows from where it started. */}
      <m.div
        className="absolute inset-y-0 left-0 w-full origin-left rounded-pill bg-accent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress }}
        transition={springs.soft}
      />
    </div>
  );
}