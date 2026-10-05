/**
 * Thin wrapper around the Telegram WebApp API.
 *
 * The design tokens from Figma are the source of truth for colours; we only
 * use Telegram for auth (initData) and for presenting the native header /
 * haptic feedback. Falls back gracefully when running outside Telegram.
 */

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

function webapp() {
  return window.Telegram?.WebApp;
}

/** The tg user, if any. */
export function getTgUser(): TelegramUser | null {
  const u = webapp()?.initDataUnsafe?.user;
  return u ?? null;
}

export function getTgId(): number | null {
  return getTgUser()?.id ?? null;
}

/** The initData string sent as the `initData` request header. */
export function getInitData(): string {
  return webapp()?.initData ?? "";
}

export function expand(): void {
  webapp()?.expand();
}

export function setHeaderColor(color: string): void {
  webapp()?.setHeaderColor?.(color);
}

/** Show the top bar back button and route `cb` on tap. */
export function attachBack(cb: () => void): () => void {
  const wb = webapp();
  const bb = wb?.BackButton;
  if (!bb) return () => {};
  bb.show();
  bb.onClick(cb);
  return () => {
    bb.hide();
    bb.offClick?.(cb);
  };
}

export function setMainButton(text: string, onClick: () => void): () => void {
  const wb = webapp();
  const mb = wb?.MainButton;
  if (!mb) return () => {};
  mb.setText(text);
  mb.show();
  mb.onClick(onClick);
  return () => {
    mb.hide();
  };
}

export function haptic(type: "success" | "error" | "warning") {
  // Notification outcomes and impact styles are separate Telegram methods.
  // Haptics must never prevent the action (for example, selecting a date).
  try {
    const feedback = (webapp() as unknown as {
      HapticFeedback?: {
        notificationOccurred?: (kind: "error" | "success" | "warning") => void;
      };
    })?.HapticFeedback;
    feedback?.notificationOccurred?.(type);
  } catch {
    // Unsupported Telegram clients can ignore haptic feedback.
  }
}
