import type { ReactNode } from "react";
import clsx from "clsx";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentToggleProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Segmented pill control for the menu / undefined-switch on plan screens,
 * plus the nutrition↔activity toggle (Group 11, 112×42 r15).
 * Active segment is accent `#f08629`, inactive `#303030`.
 */
export function SegmentToggle<T extends string>({
  items,
  value,
  onChange,
  className,
}: SegmentToggleProps<T>) {
  return (
    <div className={clsx("inline-flex rounded-card bg-surface p-1", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={clsx(
              "flex min-h-10 min-w-11 items-center justify-center gap-2 px-3 text-bodySm font-medium transition-colors",
              "rounded-card focus:outline-none",
              active && "bg-accent text-on",
              !active && "bg-transparent text-on",
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}