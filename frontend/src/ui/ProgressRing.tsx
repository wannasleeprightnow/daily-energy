import { m } from "framer-motion";
import clsx from "clsx";

import { easings } from "./motion";

interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  /** Diameter of the ring (semicircle width in Figma = 126). */
  size?: number;
  /** Radius of the arc, in px. */
  thickness?: number;
  children?: React.ReactNode;
  className?: string;
  lowerLabel?: boolean;
  mutedProgress?: boolean;
}

/**
 * Semicircular calorie/activity progress ring used on the today/plan cards.
 * Fig: "Group 12" 126×61 r30, white `#d9d9d9` track, accent fill.
 */
export function ProgressRing({
  progress,
  size = 126,
  thickness = 6,
  children,
  className,
  lowerLabel = false,
  mutedProgress = false,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - thickness) / 2;
  const circumference = Math.PI * radius;
  const dash = circumference * clamped;

  const centerY = size / 2;
  const arc = `M ${thickness / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${centerY}`;

  return (
    <div
      className={clsx("relative flex items-center justify-center", className)}
      style={{ width: size, height: size / 2 }}
    >
      <svg
        aria-hidden
        height={size / 2}
        viewBox={`0 0 ${size} ${size / 2}`}
        width={size}
      >
        <path
          d={arc}
          fill="none"
          stroke={mutedProgress ? "#555555" : "#d9d9d9"}
          strokeLinecap="round"
          strokeWidth={thickness}
        />
        {/* Progress arc: animates from empty on mount and springs between
            values on updates (SVG path repaint is cheap at this size). */}
        <m.path
          animate={{ strokeDasharray: `${dash} ${circumference}` }}
          d={arc}
          fill="none"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          stroke={mutedProgress ? "#d9d9d9" : "#f08629"}
          strokeLinecap="round"
          strokeWidth={thickness}
          transition={{ duration: 0.5, ease: easings.out }}
        />
      </svg>
      <div className={lowerLabel ? "absolute inset-0 flex items-end justify-center pb-2" : "absolute inset-x-0 flex items-center justify-center pb-4"}>
        {children}
      </div>
    </div>
  );
}
