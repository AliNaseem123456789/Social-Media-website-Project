import { apiClient, unwrap } from "./apiClient";

const PREVIEWABLE = [/^\/posts\/\d+\/?$/, /^\/u\/[^/]+\/?$/];

function isAppLink(raw) {
  try {
    const url = new URL(raw);
    if (url.origin !== window.location.origin) return false;
    return PREVIEWABLE.some((pattern) => pattern.test(url.pathname));
  } catch {
    return false;
  }
}

/**
 * Finds the first link to this app inside a text. Only those can be turned into a preview card, so the
 * lookup never leaves the API.
 */
export function findAppLink(text) {
  if (!text) return null;
  const candidates = (text.match(/https?:\/\/\S+/g) ?? []).map((url) => url.replace(/[.,)]+$/, ""));
  return candidates.find(isAppLink) ?? null;
}

export const shareService = {
  resolve: (url) => unwrap(apiClient.post("/share/resolve", { url })),
};

export default shareService;
