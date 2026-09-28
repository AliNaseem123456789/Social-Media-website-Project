import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshSession, onSessionExpired } from "../../../lib/apiClient";
import { tokenStore } from "../../../lib/tokenStore";
import { authService } from "../services/authService";

const AuthContext = createContext(null);
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("circle-auth") : null;
const REFRESH_EARLY_SECONDS = 60;

function startRefreshTimer(timerRef, expiresIn, onRefreshed, onFailed) {
  clearTimeout(timerRef.current);
  if (!expiresIn) return;
  const delay = Math.max((expiresIn - REFRESH_EARLY_SECONDS) * 1000, 10_000);
  timerRef.current = setTimeout(async () => {
    try {
      const session = await refreshSession();
      onRefreshed(session);
      startRefreshTimer(timerRef, session.expiresIn, onRefreshed, onFailed);
    } catch {
      onFailed();
    }
  }, delay);
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const refreshTimer = useRef(null);

  const scheduleRefresh = useCallback((expiresIn) => {
    startRefreshTimer(
      refreshTimer,
      expiresIn,
      (session) => setUser(session.user),
      () => {
        setUser(null);
        setStatus("anonymous");
      },
    );
  }, []);

  const applySession = useCallback(
    (session) => {
      tokenStore.set(session.accessToken);
      setUser(session.user);
      setStatus("authenticated");
      scheduleRefresh(session.expiresIn);
      return session.user;
    },
    [scheduleRefresh],
  );

  const clearSession = useCallback(() => {
    clearTimeout(refreshTimer.current);
    tokenStore.clear();
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    const timerRef = refreshTimer;
    refreshSession()
      .then((session) => active && applySession(session))
      .catch(() => active && setStatus("anonymous"));

    const unsubscribe = onSessionExpired(() => clearSession());
    const onMessage = (event) => {
      if (event.data === "logout") clearSession();
    };
    channel?.addEventListener("message", onMessage);

    return () => {
      active = false;
      unsubscribe();
      channel?.removeEventListener("message", onMessage);
      clearTimeout(timerRef.current);
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (email, password) => applySession(await authService.login({ email, password })),
    [applySession],
  );

  const signup = useCallback(
    async (username, email, password) => applySession(await authService.register({ username, email, password })),
    [applySession],
  );

  const googleLogin = useCallback(
    async (credential) => applySession(await authService.google(credential)),
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      channel?.postMessage("logout");
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const me = await authService.me();
    setUser(me);
    return me;
  }, []);

  const reloadSession = useCallback(async () => applySession(await refreshSession()), [applySession]);

  const updateUser = useCallback((patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev)), []);

  const value = useMemo(
    () => ({
      user,
      status,
      loading: status === "loading",
      isAuthenticated: status === "authenticated",
      login,
      signup,
      googleLogin,
      logout,
      refreshUser,
      reloadSession,
      updateUser,
      clearSession,
    }),
    [user, status, login, signup, googleLogin, logout, refreshUser, reloadSession, updateUser, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
