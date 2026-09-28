import axios from "axios";
import { env } from "../config/env";
import { tokenStore } from "./tokenStore";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 20000,
});

const refreshClient = axios.create({ baseURL: env.apiBaseUrl, withCredentials: true, timeout: 15000 });

const RETRYABLE_AUTH_CODES = new Set(["TOKEN_EXPIRED", "INVALID_TOKEN", "UNAUTHORIZED"]);
const NO_REFRESH_PATHS = ["/auth/refresh", "/auth/login", "/auth/register", "/auth/google", "/auth/logout"];
const sessionListeners = new Set();
let refreshPromise = null;

export function onSessionExpired(listener) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent callers share one request
 * so the refresh token is rotated only once.
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/auth/refresh")
      .then((res) => {
        const session = res.data.data;
        tokenStore.set(session.accessToken);
        return session;
      })
      .catch((err) => {
        tokenStore.clear();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((request) => {
  const token = tokenStore.get();
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    const isAuthCall = NO_REFRESH_PATHS.some((path) => original?.url?.startsWith(path));

    if (status === 401 && original && !original._retried && !isAuthCall && RETRYABLE_AUTH_CODES.has(code)) {
      original._retried = true;
      try {
        await refreshSession();
        return apiClient(original);
      } catch {
        sessionListeners.forEach((listener) => listener());
      }
    } else if (status === 401 && code === "SESSION_REVOKED") {
      tokenStore.clear();
      sessionListeners.forEach((listener) => listener());
    }
    return Promise.reject(error);
  },
);

export const unwrap = (promise) => promise.then((res) => res.data?.data);

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const apiError = error?.response?.data?.error;
  if (apiError?.details?.length) return apiError.details[0].message;
  if (apiError?.message) return apiError.message;
  if (error?.code === "ECONNABORTED") return "The request timed out. Check your connection and try again.";
  if (error?.message === "Network Error") return "Can't reach the server right now.";
  return fallback;
}

export function getFieldErrors(error) {
  const details = error?.response?.data?.error?.details || [];
  return details.reduce((acc, d) => {
    const field = d.field.split(".").pop();
    if (!acc[field]) acc[field] = d.message;
    return acc;
  }, {});
}

export default apiClient;
