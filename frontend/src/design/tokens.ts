/**
 * Design tokens extracted from the "Daily Energy — Copy" Figma file.
 * These are the single source of truth for colours, radii, spacing and
 * typography used across the app. Prefer these over ad-hoc values.
 */

export const colors = {
  bg: "#212121",
  surface: "#303030",
  surface2: "#4a4a4a",
  accent: "#f08629",
  accentSoft: "#f0a15c",
  on: "#ffffff",
  muted: "#9a9a9a",
  success: "#4caf50",
  danger: "#e5484d",
  black: "#000000",
} as const;

export const radii = {
  card: 15,
  pill: 20,
  input: 15,
} as const;

export const spacing = {
  screenX: 20, // horizontal inset for screens
  screenTop: 64,
} as const;

export const type = {
  h1: { fontSize: 32, lineHeight: 41, fontWeight: 500 }, // screen titles
  h2: { fontSize: 30, lineHeight: 39, fontWeight: 400 }, // big numbers / button text
  h3: { fontSize: 27, lineHeight: 35, fontWeight: 400 }, // wheel-centred value / input value
  body: { fontSize: 25, lineHeight: 32, fontWeight: 400 },
  bodySm: { fontSize: 17, lineHeight: 22, fontWeight: 400 },
  caption: { fontSize: 14, lineHeight: 18, fontWeight: 400 },
} as const;

export const fontFaces = {
  family: "'TT Firs Neue Trial Var', 'TT Firs Neue', Arial, sans-serif",
} as const;

/** Frame size in Figma — used to scale relative sizes on larger viewports. */
export const canvas = {
  width: 393,
  height: 852,
} as const;