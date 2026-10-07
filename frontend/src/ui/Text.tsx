import type { ElementType, ReactNode } from "react";

import clsx from "clsx";

const sizeClasses = {
  title: "text-h1 text-on",
  h2: "text-h2 text-on",
  subtitle: "text-bodySm text-on/80",
  small: "text-bodySm",
};

interface TextProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  /** Map to the Figma type scale. */
  kind?: keyof typeof sizeClasses;
}

/** Thin wrapper to keep typography and colour tokens consistent. */
export function Text({ as, kind = "subtitle", className, children }: TextProps) {
  const Component = as ?? "p";

  return (
    <Component className={clsx(sizeClasses[kind], className)}>{children}</Component>
  );
}

/** Primary screen heading (fs32/w500/lh41), e.g. "Как вас зовут?". */
export function ScreenTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={clsx(
        "text-center text-h1 text-on",
        className,
      )}
    >
      {children}
    </h1>
  );
}