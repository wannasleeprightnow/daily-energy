import type { ReactNode } from "react";
import clsx from "clsx";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Modal bottom sheet used for the "add food / activity" dialogs.
 * Overlay dims the page; panel is `#212121` with rounded top corners.
 */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "safe-bottom relative flex max-h-[88%] w-full max-w-app flex-col overflow-hidden rounded-t-card bg-[#212121] shadow-2xl",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
            <h2 className="text-h2 text-on">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="flex h-11 w-11 items-center justify-center text-on/70"
            >
              ✕
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}