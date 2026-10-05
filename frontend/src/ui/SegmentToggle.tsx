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
 * Active segment is outlined with the accent; inactive stays transparent.
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
              "rounded-card border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active
                ? "border-accent bg-transparent text-on shadow-[0_0_6px_rgba(240,134,41,0.4)]"
                : "border-transparent bg-transparent text-on",
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
