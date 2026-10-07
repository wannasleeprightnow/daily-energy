import type { ReactNode } from "react";
import clsx from "clsx";
import { m } from "framer-motion";
import { springs } from "./motion";
import { GhostButton } from "./Button";

interface TabBarProps {
  /** Left navigation slot. */
  left: ReactNode;
  /** Center navigation slot. */
  center: ReactNode;
  /** Right navigation slot. */
  right: ReactNode;
  className?: string;
}

/**
 * The bottom fixed navigation bar.
 * Fig: 393×75 gradient backdrop, icons 40×40, label fs14/w500.
 * Inactive `#666666`, active white. Uses safe-area bottom padding.
 */
export function TabBar({ left, center, right, className }: TabBarProps) {
  return (
    <nav
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-app grid-cols-3 items-center",
        "border-t border-white/5 bg-[#212121] px-5 pt-3",
        className,
      )}
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="flex justify-start">{left}</div>
      <div className="flex justify-center">{center}</div>
      <div className="flex justify-end">{right}</div>
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
  return (
    <GhostButton
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{ color: active ? "#ffffff" : "#666666" }}
      className={clsx("flex flex-col items-center gap-1")}
    >
      <span className="flex h-10 w-10 items-center justify-center">
        {/* Active tab pops gently: transform-only spring on one small node. */}
        <m.span
          className="flex items-center justify-center"
          initial={false}
          animate={{ scale: active ? 1.12 : 1 }}
          transition={springs.snappy}
        >
          {icon}
        </m.span>
      </span>
      <span className="text-caption font-medium">{label}</span>
    </GhostButton>
  );
}
