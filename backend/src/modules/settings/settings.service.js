import { cache } from "#core/cache/cache.service.js";
import { cacheKeys } from "#core/cache/keys.js";
import { settingsRepository, DEFAULT_SETTINGS } from "./settings.repository.js";

const TTL = 300;

const present = (row) => ({ ...DEFAULT_SETTINGS, ...(row ?? {}), updatedAt: row?.updatedAt ?? null });

export const settingsService = {
  async get(userId) {
    const row = await cache.wrap(cacheKeys.userSettings(userId), TTL, async () =>
      present(await settingsRepository.find(userId)),
    );
    return present(row);
  },

  async update(userId, input) {
    const row = await settingsRepository.save(userId, input);
    const settings = present(row);
    await cache.set(cacheKeys.userSettings(userId), settings, TTL);
    await cache.del(cacheKeys.profile(userId), cacheKeys.userMe(userId));
    return settings;
  },
};

/**
 * Used by the notification worker: whether a given email channel is switched on for a recipient.
 */
export async function emailEnabled(userId, channel) {
  const settings = await settingsService.get(userId);
  const value = settings[channel];
  return value === undefined ? true : Boolean(value);
}
