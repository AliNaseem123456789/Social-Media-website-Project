import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { createAppTheme } from "../theme/theme";

const STORAGE_KEY = "circle:theme";
const PREFERENCES = ["system", "light", "dark"];

const ColorModeContext = createContext({ preference: "system", mode: "light", setPreference: () => {} });

const readStored = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return PREFERENCES.includes(value) ? value : "system";
  } catch {
    return "system";
  }
};

const systemPrefersDark = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function ColorModeProvider({ children }) {
  const [preference, setStoredPreference] = useState(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return undefined;
    const listener = (event) => setSystemDark(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  const mode = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const setPreference = useCallback((next) => {
    const value = PREFERENCES.includes(next) ? next : "system";
    setStoredPreference(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // A browser with storage blocked still gets the theme for this session.
    }
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo(() => ({ preference, mode, setPreference }), [preference, mode, setPreference]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export const useColorMode = () => useContext(ColorModeContext);
