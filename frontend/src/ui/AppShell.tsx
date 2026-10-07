import type { HTMLAttributes, ReactNode } from "react";

import clsx from "clsx";

export type ScreenPadding = "none" | "default";

interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Render the gradient bottom-safe area strip (used by screens with TabBar). */
  withTabBar?: boolean;
}

/**
 * The phone-sized column that every screen lives in.
 *
 * Constrained to 430px on desktop, full-width on mobile, with the #212121
 * background from Figma and iOS safe-area support.
 */
export function AppShell({
  children,
  withTabBar = false,
  className,
  ...rest
}: AppShellProps) {
  return (
    <div
      className={clsx("app-root flex flex-col", className)}
      {...rest}
    >
      {children}
      {withTabBar && (
        <div
          aria-hidden
          className="safe-bottom"
          style={{ height: "env(safe-area-inset-bottom, 0px)" }}
        />
      )}
    </div>
  );
}
