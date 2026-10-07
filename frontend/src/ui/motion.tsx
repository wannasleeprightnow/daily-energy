import { useEffect, type ReactNode } from "react";
import {
  domMax,
  LazyMotion,
  MotionConfig,
  m,
  useSpring,
  useTransform,
  type Transition,
  type Variants,
} from "framer-motion";
import clsx from "clsx";

/**
 * Shared animation kit for the app.
 *
 * Performance rules baked into every preset here:
 *  - only `transform` / `opacity` are animated (GPU-composited properties);
 *  - durations are short (0.15–0.4s) and every list cascade is capped;
 *  - `prefers-reduced-motion` is honoured globally via `MotionConfig`;
 *  - `LazyMotion` + the lightweight `m.*` components keep the bundle small.
 */

/** Duration tokens (seconds). */
export const durations = {
  fast: 0.16,
  normal: 0.24,
  slow: 0.4,
} as const;

/** Cubic-bezier easings: emphasised out for entrances, smooth for exits. */
export const easings = {
  out: [0.16, 1, 0.3, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const,
};

/** Shared spring presets (stiff enough to feel native, no wobbling). */
export const springs: Record<"soft" | "snappy", Transition> = {
  soft: { type: "spring", stiffness: 380, damping: 32, mass: 0.9 },
  snappy: { type: "spring", stiffness: 480, damping: 34, mass: 0.8 },
};

/* ------------------------------------------------------------------ */
/*  Variants                                                           */
/* ------------------------------------------------------------------ */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.normal, ease: easings.out },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.out },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: springs.soft },
};

/** Routed-screen transition: fade + slight vertical slide (enter-only). */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.out },
  },
};

/**
 * Onboarding wizard step, direction-aware.
 * Uses the `custom` prop (1 = forward, -1 = back) to pick the slide side.
 */
export const stepVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 32 : -32,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.normal, ease: easings.out },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -32 : 32,
    transition: { duration: durations.fast, ease: easings.smooth },
  }),
};

/** Month-calendar slide, direction-aware (custom = -1 | 1). */
export const monthVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 28,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.normal, ease: easings.out },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -28,
    transition: { duration: durations.fast, ease: easings.smooth },
  }),
};

/** Bottom-sheet slide-up + overlay fade pair. */
export const sheetVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: springs.soft },
  exit: {
    y: "100%",
    transition: { duration: durations.normal, ease: easings.smooth },
  },
};

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.fast } },
  exit: { opacity: 0, transition: { duration: durations.fast } },
};

/**
 * Staggered list row. Pass `custom={index}` so the cascade stays capped:
 * after `cap` items every further row uses the same (max) delay, keeping
 * long lists cheap — no growing delay chain, no janky entrance.
 */
export const staggerCap = 8;

export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(index, staggerCap) * 0.035,
      duration: durations.normal,
      ease: easings.out,
    },
  }),
};

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

/**
 * Global motion runtime. `LazyMotion(domMax)` ships gesture + layout
 * features while still using the small `m.*` components (`strict` enforces
 * it). `reducedMotion="user"` respects the OS accessibility setting by
 * disabling transforms and layout animations.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** Wrapper for routed screens: one-shot fade + slide on mount. */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <m.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className={clsx("flex min-h-full flex-1 flex-col", className)}
    >
      {children}
    </m.div>
  );
}

/**
 * Smoothly counts between integer values (e.g. "осталось N ккал").
 * Driven by a spring on a motion value — no React re-render per frame.
 */
export function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const spring = useSpring(value, { stiffness: 120, damping: 26, mass: 0.8 });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  const text = useTransform(spring, (v) => `${Math.round(v)}`);
  return <m.span className={className}>{text}</m.span>;
}
