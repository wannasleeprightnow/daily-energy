import type { ReactNode } from "react";
import clsx from "clsx";
import { GhostButton } from "./Button";

interface TabBarProps {
  /** Left slot — in Figma this is the "12 June" date cluster. */
  left: ReactNode;
  /** Right slot — typically two navigation buttons. */
  right: ReactNode;
  className?: string;
}

/**
 * The bottom fixed navigation bar.
 * Fig: 393×75 gradient backdrop, icons 40×40, label fs14/w500.
 * Inactive `#666666`, active white. Uses safe-area bottom padding.
 */
export function TabBar({ left, right, className }: TabBarProps) {
  return (
    <nav
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30 flex w-full max-w-app items-center justify-between",
        "border-t border-white/5 bg-[#212121] px-5 pt-3",
        className,
      )}
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {left}
      {right}
    </nav>
  );
}

interface NavItemProps {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

/** Single tappable item of the TabBar (label + 40×40 icon). */
export function NavItem({ label, icon, active = false, onClick }: NavItemProps) {
  const color = active ? "text-on" : "text-[#666666]";
  return (
    <GhostButton
      onClick={onClick}
      className={clsx("flex flex-col items-center gap-1", color)}
    >
      <span className="flex h-10 w-10 items-center justify-center">{icon}</span>
      <span className="text-caption font-medium">{label}</span>
    </GhostButton>
  );
}
