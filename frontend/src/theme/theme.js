import { createTheme, alpha } from "@mui/material/styles";
import { palettes, cssVariables } from "./palette";
import { tokens } from "./tokens";

const FONTS = {
  display: tokens.fontDisplay,
  body: tokens.fontBody,
  mono: tokens.fontMono,
};

export function createAppTheme(mode = "light") {
  const p = palettes[mode] ?? palettes.light;
  const dark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: p.ember, dark: p.emberDark, light: dark ? "#ff8b6b" : "#ea6a4b", contrastText: dark ? "#1a120e" : "#fff8f4" },
      secondary: { main: p.ink, contrastText: p.paper },
      success: { main: p.signal, light: p.signalTint },
      error: { main: p.danger },
      background: { default: p.paper, paper: p.surface },
      text: { primary: p.ink, secondary: p.inkSoft, disabled: p.inkFaint },
      divider: p.line,
      action: { hover: alpha(p.ink, 0.04), selected: alpha(p.ember, 0.08) },
    },
    shape: { borderRadius: tokens.radius.md },
    typography: {
      fontFamily: FONTS.body,
      h1: { fontFamily: FONTS.display, fontWeight: 600, letterSpacing: "-0.03em" },
      h2: { fontFamily: FONTS.display, fontWeight: 600, letterSpacing: "-0.025em" },
      h3: { fontFamily: FONTS.display, fontWeight: 600, letterSpacing: "-0.02em", fontSize: "2rem" },
      h4: { fontFamily: FONTS.display, fontWeight: 600, letterSpacing: "-0.02em", fontSize: "1.65rem" },
      h5: { fontWeight: 700, letterSpacing: "-0.015em", fontSize: "1.2rem" },
      h6: { fontWeight: 700, letterSpacing: "-0.01em", fontSize: "1.02rem" },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, fontSize: "0.9rem" },
      body1: { fontSize: "0.95rem", lineHeight: 1.6 },
      body2: { fontSize: "0.875rem", lineHeight: 1.55 },
      caption: { color: p.inkFaint, fontSize: "0.78rem" },
      overline: { fontFamily: FONTS.mono, letterSpacing: "0.08em", fontSize: "0.72rem", lineHeight: 1.6 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": cssVariables("light"),
          '[data-theme="dark"]': cssVariables("dark"),
          body: { backgroundColor: p.paper, WebkitFontSmoothing: "antialiased" },
          "::selection": { background: p.emberTint, color: p.emberInk },
          "a:has(.MuiAvatar-root)": { textDecoration: "none", display: "inline-flex" },
          "*::-webkit-scrollbar": { width: 10, height: 10 },
          "*::-webkit-scrollbar-thumb": {
            background: alpha(p.ink, 0.15),
            borderRadius: 999,
            border: `3px solid ${p.paper}`,
          },
          "img, video": { colorScheme: "normal" },
          "@keyframes assistantSpin": { to: { transform: "rotate(360deg)" } },
          "@keyframes assistantBlink": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0 } },
          "@keyframes pulse-dot": {
            "0%, 100%": { opacity: 1, transform: "scale(1)" },
            "50%": { opacity: 0.35, transform: "scale(0.75)" },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: tokens.radius.pill, paddingInline: 18, minHeight: 40 },
          sizeSmall: { minHeight: 32, paddingInline: 14, fontSize: "0.82rem" },
          sizeLarge: { minHeight: 48, paddingInline: 26, fontSize: "0.98rem" },
          containedPrimary: {
            boxShadow: p.shadowEmber,
            "&:hover": { boxShadow: p.shadowEmber },
          },
          containedSecondary: { "&:hover": { backgroundColor: dark ? "#e6dfd2" : "#2b2720" } },
          outlined: {
            borderColor: p.line,
            color: p.ink,
            "&:hover": { borderColor: p.ink, backgroundColor: "transparent" },
          },
          text: { color: p.inkSoft, "&:hover": { color: p.ink } },
        },
      },
      MuiLink: {
        defaultProps: { underline: "hover" },
        styleOverrides: { root: { color: p.ember, fontWeight: 600 } },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { color: p.inkSoft, "&:hover": { color: p.ink, backgroundColor: alpha(p.ink, 0.05) } },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none" }, outlined: { borderColor: p.line } },
      },
      MuiCard: {
        defaultProps: { variant: "outlined" },
        styleOverrides: { root: { borderRadius: tokens.radius.lg, borderColor: p.line, boxShadow: p.shadowCard } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: p.surface,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: p.line },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: p.inkFaint },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: p.ink, borderWidth: 1.5 },
          },
          input: { paddingBlock: 12 },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { color: p.inkSoft, "&.Mui-focused": { color: p.ink } } } },
      MuiTextField: { defaultProps: { fullWidth: true } },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44 },
          indicator: { height: 2.5, borderRadius: 2, backgroundColor: p.ink },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            minHeight: 44,
            color: p.inkFaint,
            "&.Mui-selected": { color: p.ink },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: tokens.radius.pill, fontWeight: 500 },
          outlined: { borderColor: p.line },
        },
      },
      MuiAvatar: { styleOverrides: { root: { fontWeight: 700, fontSize: "0.9rem" } } },
      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: {
          tooltip: { backgroundColor: p.ink, color: p.onInk, fontSize: "0.75rem", borderRadius: 8, padding: "6px 10px" },
          arrow: { color: p.ink },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { borderRadius: 14, border: `1px solid ${p.line}`, boxShadow: p.shadowRaised, marginTop: 6 },
          list: { padding: 6 },
        },
      },
      MuiMenuItem: {
        styleOverrides: { root: { borderRadius: 8, fontSize: "0.9rem", gap: 10, minHeight: 38 } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: tokens.radius.lg, border: `1px solid ${p.line}` } },
      },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700, fontSize: "1.1rem" } } },
      MuiSkeleton: { defaultProps: { animation: "wave" }, styleOverrides: { root: { backgroundColor: p.lineSoft } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12, alignItems: "center" } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiBadge: { styleOverrides: { badge: { fontWeight: 700, fontSize: "0.68rem" } } },
      MuiDivider: { styleOverrides: { root: { borderColor: p.line } } },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, backgroundColor: p.lineSoft } } },
      MuiSwitch: {
        styleOverrides: {
          track: { backgroundColor: p.inkFaint, opacity: 0.4 },
        },
      },
    },
  });
}

export const theme = createAppTheme("light");
