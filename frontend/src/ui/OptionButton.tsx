import type { ReactNode } from "react";
import clsx from "clsx";

interface OptionButtonProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * A full-width tap option card used in onboarding (gender, goal, activity).
 * Fig: 320×67 r15 `#303030`, fs25 label; selected state uses the accent.
 */
export function OptionButton({
  children,
  selected = false,
  onClick,
  className,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        "flex min-h-[68px] w-full items-center gap-3 rounded-card px-4 text-left text-body transition-colors",
        "min-w-11 select-none focus:outline-none",
        selected ? "bg-accent text-on" : "bg-surface text-on",
        className,
      )}
    >
      {children}
    </button>
  );
}