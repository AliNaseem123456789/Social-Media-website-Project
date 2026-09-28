let accessToken = null;
const listeners = new Set();

export const tokenStore = {
  get() {
    return accessToken;
  },
  set(token) {
    accessToken = token || null;
    listeners.forEach((listener) => listener(accessToken));
  },
  clear() {
    this.set(null);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
