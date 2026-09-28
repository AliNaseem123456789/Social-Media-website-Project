const trimSlash = (value) => (value || "").replace(/\/+$/, "");

const apiOrigin = trimSlash(import.meta.env.VITE_API_URL);

export const env = Object.freeze({
  apiBaseUrl: `${apiOrigin}/api/v1`,
  socketUrl: trimSlash(import.meta.env.VITE_SOCKET_URL) || apiOrigin || window.location.origin,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  isDev: import.meta.env.DEV,
});
