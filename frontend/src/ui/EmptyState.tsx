import type { ReactNode } from "react";
import clsx from "clsx";
import { m } from "framer-motion";
import { fadeIn } from "./motion";

interface EmptyStateProps {
  children: ReactNode;
  className?: string;
}

/**
 * "Nothing here yet" placeholder.
 * Fig: `Тут пока ничего:)` fs17/w500 `#858585`, centred inside the content card.
 */
export function EmptyState({ children, className }: EmptyStateProps) {
  return (
    <m.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className={clsx(
        "flex flex-1 items-center justify-center py-8 text-center text-bodySm font-medium text-[#858585]",
        className,
      )}
    >
      {children}
    </m.div>
  );
}