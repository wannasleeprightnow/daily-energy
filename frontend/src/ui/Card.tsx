import type { HTMLAttributes, ReactNode } from "react";

import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Subtle raised surface (Fig. `#272727`) with r15, default. */
  tone?: "default" | "subtle" | "flat";
}

/**
 * The main content surface. Default tone is the `#272727` card used for the
 * plan/history content areas (Group 17 / Rectangle 4, r15).
 */
export function Card({ children, tone = "default", className, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        "flex flex-col rounded-card",
        tone === "default" && "bg-[#272727] text-on",
        tone === "subtle" && "bg-surface text-on",
        tone === "flat" && "bg-transparent",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}