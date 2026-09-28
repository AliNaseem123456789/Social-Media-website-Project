import { cssVar } from "./palette";

/**
 * Design tokens for component level styling. Colours resolve through CSS variables, so the same
 * `tokens.ink` follows whichever colour mode is active without any component re-reading the theme.
 */
export const tokens = Object.freeze({
  paper: cssVar("paper"),
  paperDeep: cssVar("paperDeep"),
  surface: cssVar("surface"),
  surfaceMuted: cssVar("surfaceMuted"),
  ink: cssVar("ink"),
  inkSoft: cssVar("inkSoft"),
  inkFaint: cssVar("inkFaint"),
  line: cssVar("line"),
  lineSoft: cssVar("lineSoft"),
  ember: cssVar("ember"),
  emberDark: cssVar("emberDark"),
  emberInk: cssVar("emberInk"),
  emberTint: cssVar("emberTint"),
  signal: cssVar("signal"),
  signalTint: cssVar("signalTint"),
  danger: cssVar("danger"),
  onInk: cssVar("onInk"),
  scrim: cssVar("scrim"),
  dark: "#171310",
  fontDisplay: `"Fraunces Variable", "Fraunces", "Iowan Old Style", Georgia, serif`,
  fontBody: `"Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  fontMono: `"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace`,
  radius: { sm: 10, md: 16, lg: 22, pill: 999 },
  shadow: {
    card: cssVar("shadowCard"),
    raised: cssVar("shadowRaised"),
    ember: cssVar("shadowEmber"),
  },
  /** Extra hues for category badges, taken from the avatar palette so they stay in family. */
  accent: { blue: "#3b5bdb", violet: "#8a4fbf", rust: "#b4531f" },
  /** Translucent fills that have to sit on top of whichever background is active. */
  wash: {
    ink: "color-mix(in srgb, currentColor 6%, transparent)",
    inkStrong: "color-mix(in srgb, currentColor 12%, transparent)",
  },
});

const AVATAR_COLORS = ["#e0431f", "#1c7a54", "#4a463f", "#b4531f", "#3b5bdb", "#8a4fbf"];

export function colorFor(seed = "") {
  const sum = [...String(seed)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
