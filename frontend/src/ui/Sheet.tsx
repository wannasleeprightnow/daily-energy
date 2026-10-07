import { AnimatePresence, m } from "framer-motion";
import type { ReactNode } from "react";
import clsx from "clsx";
import { overlayVariants, sheetVariants } from "./motion";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Dismiss thresholds: either a deliberate drag or a quick fling. */
const CLOSE_OFFSET_PX = 100;
const CLOSE_VELOCITY = 600;

/**
 * Modal bottom sheet used for the "add food / activity" dialogs.
 * Overlay dims the page; panel is `#212121` with rounded top corners.
 * Slides up with a spring, supports drag-to-dismiss (swipe down), and
 * animates only transform/opacity for GPU-friendly transitions.
 */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <m.button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <m.div
            role="dialog"
            aria-modal="true"
            className={clsx(
              "safe-bottom relative flex max-h-[88%] w-full max-w-app flex-col overflow-hidden rounded-t-card bg-[#212121] shadow-2xl",
              className,
            )}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > CLOSE_OFFSET_PX || info.velocity.y > CLOSE_VELOCITY) {
                onClose();
              }
            }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
                <h2 className="text-h2 text-on">{title}</h2>
                <m.button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть"
                  whileTap={{ scale: 0.85 }}
                  className="flex h-11 w-11 items-center justify-center text-on/70"
                >
                  ✕
                </m.button>
              </div>
            )}
            <div className="overflow-y-auto px-5 py-4">{children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
