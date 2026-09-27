import clsx from "clsx";

interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  /** Diameter of the ring (semicircle width in Figma = 126). */
  size?: number;
  /** Radius of the arc, in px. */
  thickness?: number;
  children?: React.ReactNode;
  className?: string;
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
        viewBox={`0 0 ${size} ${size / 2}`}
        width={size}
        height={size / 2}
        aria-hidden
      >
        <path
          d={arc}
          fill="none"
          stroke="#d9d9d9"
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        <path
          d={arc}
          fill="none"
          stroke="#f08629"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-x-0 flex items-center justify-center pb-4">
        {children}
      </div>
    </div>
  );
}