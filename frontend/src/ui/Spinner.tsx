import clsx from "clsx";

interface SpinnerProps {
  size?: number;
  className?: string;
}

/** Simple accent spinner for async states. */
export function Spinner({ size = 24, className }: SpinnerProps) {
  return (
    <span
      aria-label="Загрузка"
      role="status"
      style={{
        width: size,
        height: size,
        border: "3px solid rgba(240,134,41,0.25)",
        borderTopColor: "#f08629",
      }}
      className={clsx("inline-block animate-spin rounded-full", className)}
    />
  );
}