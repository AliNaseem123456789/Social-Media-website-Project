const loaders = {
  auth: () => import("./auth/index.js"),
  users: () => import("./users/index.js"),
  follows: () => import("./follows/index.js"),
  settings: () => import("./settings/index.js"),
  posts: () => import("./posts/index.js"),
  friends: () => import("./friends/index.js"),
  chat: () => import("./chat/index.js"),
  calls: () => import("./calls/index.js"),
  notifications: () => import("./notifications/index.js"),
  feed: () => import("./feed/index.js"),
  search: () => import("./search/index.js"),
  suggestions: () => import("./suggestions/index.js"),
  share: () => import("./share/index.js"),
  moderation: () => import("./moderation/index.js"),
  analytics: () => import("./analytics/index.js"),
};

export const MODULE_NAMES = Object.keys(loaders);

/**
 * Loads the modules this process should serve. ENABLED_MODULES="*" loads everything, otherwise a
 * comma separated list such as "auth,users" lets one image run as independent services.
 */
export async function loadModules(enabled) {
  const names = enabled.includes("*") ? MODULE_NAMES : enabled;
  const unknown = names.filter((n) => !loaders[n]);
  if (unknown.length) throw new Error(`Unknown modules in ENABLED_MODULES: ${unknown.join(", ")}`);
  const modules = await Promise.all(names.map(async (name) => (await loaders[name]()).default));
  return modules;
}
