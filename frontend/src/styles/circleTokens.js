// Place at: src/styles/circleTokens.js
//
// Shared Circle brand tokens — single source of truth so every screen
// (landing, friends, profile, …) renders from the same palette / type
// scale instead of drifting back toward ad-hoc blues and grays.
import React from "react";
import { GlobalStyles } from "@mui/material";

export const T = {
  paper: "#faf8f4",
  surface: "#ffffff",
  ink: "#16140f",
  inkSoft: "#58534a",
  inkFaint: "#948d80",
  line: "#e7e1d5",
  ember: "#e0431f",
  emberInk: "#7c2410",
  emberTint: "#fce6dd",
  signal: "#1c7a54",
  signalTint: "#dcf1e6",
  fontDisplay: `"Fraunces", "Iowan Old Style", serif`,
  fontBody: `"Inter", -apple-system, BlinkMacSystemFont, sans-serif`,
  fontMono: `"IBM Plex Mono", ui-monospace, monospace`,
};

export const AVATAR_COLORS = [T.ember, T.signal, "#4a463f", "#c93a19"];
export const colorFor = (str = "") =>
  AVATAR_COLORS[[...str].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

// Flat by default — border only, no resting shadow. Add hover states
// per-component where something is actually interactive.
export const cardSx = {
  bgcolor: T.surface,
  border: `1px solid ${T.line}`,
  borderRadius: "20px",
};

export const eyebrowSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
  fontFamily: T.fontMono,
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.inkFaint,
};

// Drop once near the root of a route to load the brand faces + shared
// keyframes. Safe on multiple pages — the browser dedupes repeat @import.
export function CircleFonts() {
  return (
    <GlobalStyles
      styles={{
        "@import":
          "url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap')",
        "@keyframes circle-pulse": {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.35, transform: "scale(0.7)" },
        },
      }}
    />
  );
}