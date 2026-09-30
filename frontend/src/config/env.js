const trimSlash = (value) => (value || "").replace(/\/+$/, "");

const apiOrigin = trimSlash(import.meta.env.VITE_API_URL);

export const env = Object.freeze({
  apiBaseUrl: `${apiOrigin}/api/v1`,
  socketUrl: trimSlash(import.meta.env.VITE_SOCKET_URL) || apiOrigin || window.location.origin,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  // The Python assistant service. Unset means every AI feature is hidden rather than broken.
  assistantUrl: trimSlash(import.meta.env.VITE_ASSISTANT_URL),
  isDev: import.meta.env.DEV,
});
