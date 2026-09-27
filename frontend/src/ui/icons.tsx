/**
 * Icon set for the app.
 *
 * Every path below is a minimal inline-SVG reproduction of the Figma
 * vector nodes (CalendarWeekFill, ForkAndKnife, Running, Account, Messages,
 * BaselineAccountCircle, Pencil, Check, Cross, CrossMark, PersonStanding,
 * PersonWalking, PersonRunning). All are stroke- or fill-based so they can
 * inherit the Figma accent colour (#f08629) or inherit currentColor.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number | undefined, props: IconProps) {
  const { size: _s, ...rest } = props;
  return {
    width: size ?? 24,
    height: size ?? 24,
    "aria-hidden": true,
    ...rest,
  };
}

/** Figma "CalendarWeekFill" — the top-right calendar trigger (36×36, #f08629). */
export function CalendarIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...base(size, props)}>
      <path
        fillRule="evenodd"
        d="M3 6.5a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Zm1.5 2v2h15v-2h-15Zm0 4v7h15v-7h-15Z"
      />
    </svg>
  );
}

/** Figma "CalendarEvent" — the calendar screen header icon. */
export function CalendarEventIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...base(size, props)}>
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 3v4M16 3v4M3 10h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Figma "ForkAndKnife" — the food tab icon (90×90 in the mockup). */
export function ForkKnifeIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...base(size, props)}>
      <path d="M5 2v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2h-2v7H8V2H5Zm2 11a1 1 0 0 0-1 1v8h2v-8a1 1 0 0 0-1-1Z" />
      <path d="M17 2c-2.5 0-4 2-4 5 0 3 1.5 5 4 5v10h2V7c1.2-.5 2-1.8 2-3.5 0-1-.5-1.5-2-1.5Z" />
    </svg>
  );
}

/** Figma "Running (2)" — the activity tab icon. */
export function RunningIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...base(size, props)}>
      <path d="M14.5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM10 21l3-7 3 2 3 4h2.5l-4-5.5-2-3 3-3.5-2-1.5L10 12l-3 4-3-1.5L2 16l3 1.5 2 3.5H10Z" />
    </svg>
  );
}

/** Figma "Account" — the profile tab icon. */
export function AccountIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...base(size, props)}>
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 3-9 6v2h18v-2c0-3-4-6-9-6Z" />
    </svg>
  );
}

/** Figma "BaselineAccountCircle" — the avatar in profile (57×57). */
export function AccountCircleIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...base(size, props)}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 16a8 8 0 0 1-8-8h16a8 8 0 0 1-8 8Z" />
    </svg>
  );
}

/** Figma "Messages" — the chat tab icon (40×40, stroke 2). */
export function MessagesIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...base(size, props)}>
      <path
        d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 4V5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Figma "Pencil" — the edit button in profile (24×24, #ff7700). */
export function PencilIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...base(size, props)}>
      <path
        d="M16.5 3.5l4 4L8 20H4v-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Figma "Check" — the save button in edit profile. */
export function CheckIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...base(size, props)}>
      <path
        d="M5 12.5l4.5 4.5L19 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Figma "Cross" — the close button in a sheet. */
export function CrossIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...base(size, props)}>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Figma "ArrowLeft" — back navigation (27×27). */
export function ArrowLeftIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...base(size, props)}>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Figma "CrossMark" — the + add button in the plan header (#f08629). */
export function AddIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...base(size, props)}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Figma "PersonStanding". */
export function PersonStandingIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...base(size, props)}>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M9 10h6v6h2v4h-2v-4h-2v4H9v-4h2v-2H9v2H7v-4h2v-2Z" />
    </svg>
  );
}

/** Figma "PersonWalking". */
export function PersonWalkingIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...base(size, props)}>
      <circle cx="13" cy="4" r="2.5" />
      <path d="M12 8l5 2 2 5-2 1-2-3-2 1v6h-2v-6l-3-2 1-2 3 1V8Z" />
    </svg>
  );
}

/** Figma "PersonRunning". */
export function PersonRunningIcon({ size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...base(size, props)}>
      <circle cx="15" cy="4" r="2.5" />
      <path d="M14 8l5 2 2 5-2 1-2-3-3 1-1 5-2 1-3-6 4-3 1-3Z" />
    </svg>
  );
}