/**
 * Raw colour values per mode. Components never read these directly: they use the CSS variables in
 * tokens.js, which this file feeds. Only the MUI theme needs the real values, because MUI computes
 * derived colours (alpha blends, hover states) at build time.
 */
export const palettes = {
  light: {
    paper: "#faf8f4",
    paperDeep: "#f3efe7",
    surface: "#ffffff",
    surfaceMuted: "#f7f4ee",
    ink: "#16140f",
    inkSoft: "#58534a",
    inkFaint: "#948d80",
    line: "#e7e1d5",
    lineSoft: "#efeae0",
    ember: "#e0431f",
    emberDark: "#c93a19",
    emberInk: "#7c2410",
    emberTint: "#fce6dd",
    signal: "#1c7a54",
    signalTint: "#dcf1e6",
    danger: "#c0321c",
    onInk: "#ffffff",
    shadowCard: "0 1px 2px rgba(22, 20, 15, 0.04)",
    shadowRaised: "0 12px 32px -12px rgba(22, 20, 15, 0.18)",
    shadowEmber: "0 10px 24px -10px rgba(224, 67, 31, 0.55)",
    scrim: "rgba(22,20,15,.7)",
  },
  dark: {
    paper: "#14120f",
    paperDeep: "#0f0e0c",
    surface: "#1c1a16",
    surfaceMuted: "#221f1a",
    ink: "#f5f1e8",
    inkSoft: "#b4ad9f",
    inkFaint: "#867f72",
    line: "#302c25",
    lineSoft: "#282520",
    ember: "#ff6b45",
    emberDark: "#e0431f",
    emberInk: "#ffc2ae",
    emberTint: "#3a1d14",
    signal: "#4cc38a",
    signalTint: "#15321f",
    danger: "#f26a53",
    onInk: "#14120f",
    shadowCard: "0 1px 2px rgba(0, 0, 0, 0.35)",
    shadowRaised: "0 16px 38px -14px rgba(0, 0, 0, 0.7)",
    shadowEmber: "0 10px 24px -12px rgba(255, 107, 69, 0.45)",
    scrim: "rgba(0,0,0,.72)",
  },
};

const CSS_NAMES = {
  paper: "--c-paper",
  paperDeep: "--c-paper-deep",
  surface: "--c-surface",
  surfaceMuted: "--c-surface-muted",
  ink: "--c-ink",
  inkSoft: "--c-ink-soft",
  inkFaint: "--c-ink-faint",
  line: "--c-line",
  lineSoft: "--c-line-soft",
  ember: "--c-ember",
  emberDark: "--c-ember-dark",
  emberInk: "--c-ember-ink",
  emberTint: "--c-ember-tint",
  signal: "--c-signal",
  signalTint: "--c-signal-tint",
  danger: "--c-danger",
  onInk: "--c-on-ink",
  shadowCard: "--shadow-card",
  shadowRaised: "--shadow-raised",
  shadowEmber: "--shadow-ember",
  scrim: "--c-scrim",
};

export const cssVar = (key) => `var(${CSS_NAMES[key]})`;

export function cssVariables(mode) {
  return Object.fromEntries(Object.entries(palettes[mode]).map(([key, value]) => [CSS_NAMES[key], value]));
}
