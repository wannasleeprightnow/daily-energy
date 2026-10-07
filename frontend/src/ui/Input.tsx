import { forwardRef, type InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Placeholder text colour follows Figma (fs32, `#4a4a4a`). */
}

/**
 * Primary text input (Fig. "Rectangle 4" in Group 2 — 320×67, r15, `#303030`).
 * Font is fs32 to match the onboarding "Имя" field.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full rounded-card bg-surface px-5 py-4 text-h2 text-on",
          "placeholder:text-surface2 focus:outline-none",
          className,
        )}
        {...rest}
      />
    );
  },
);
