/**
 * Small format/date helpers used across the app.
 */

/** Format a timestamp (seconds) as `DD.MM` e.g. "05.07". */
export function formatShortDate(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

/** Format a timestamp as `DD Month` for the date under "Сегодня", e.g. "12 June". */
export function formatDateWithMonth(timestampSeconds?: number): string {
  const d = timestampSeconds
    ? new Date(timestampSeconds * 1000)
    : new Date();
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${day} ${month}`;
}

/** HH:mm 24-hour label for action rows (e.g. "18:57"). */
export function formatClock(timestampSeconds?: number): string {
  const d = timestampSeconds ? new Date(timestampSeconds * 1000) : new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Format a TS epoch (seconds) as `DD.MM.YYYY`. */
export function formatFullDate(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

/** `Дата ISO?` for an action based on ts. */
export function dateOf(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

/** Start (00:00) and end (24:00) of the day started at `base`. */
export function dayRange(base: Date): { start_at: number; finish_at: number } {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const start = Math.floor(d.getTime() / 1000);
  const end = Math.floor(d.getTime() / 1000) + 86400;
  return { start_at: start, finish_at: end };
}

export function nowStartOfDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 0..100 clamped percent. */
export function percentage(part: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}