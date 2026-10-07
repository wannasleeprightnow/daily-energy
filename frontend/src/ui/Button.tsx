import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type Variant = "primary" | "ghost" | "surface" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-on hover:bg-accent-soft",
  ghost: "bg-transparent text-on",
  surface: "bg-surface2 text-on hover:bg-surface",
  outline: "border border-accent bg-surface text-on hover:bg-surface2",
};

/**
 * Primary rectangular pill button (Figma "Rectangle 1" — 66×57 etc.).
 * Rests on the accent colour; text is fs30 for the arrow/Go variants.
 */
export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "flex items-center justify-center gap-2 rounded-pill",
        "transition-[transform,background-color,opacity] duration-150 active:scale-[0.97]",
        "min-h-11 min-w-11 select-none disabled:opacity-40",
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Transparent ghost button for back arrows / close buttons. */
export function GhostButton({
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "flex min-h-11 min-w-11 items-center justify-center text-on",
        "transition-[transform,opacity] duration-150 active:scale-90 active:opacity-60 disabled:opacity-40",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Small icon+label pill used in the plan header row (e.g. the "+" add
 * activity/food button sized 112×42 as in "Group 11").
 */
export function IconPillButton({
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "flex min-h-11 items-center justify-center gap-2 rounded-card bg-accent px-4 text-bodySm font-medium text-on",
        "transition-[transform,background-color,opacity] duration-150 active:scale-[0.97] active:bg-accent-soft disabled:opacity-40",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
