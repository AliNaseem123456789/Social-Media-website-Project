import { randomUUID } from "node:crypto";
import { config } from "#config";
import { AppError } from "#core/http/errors.js";
import { childLogger } from "#core/logger/index.js";
import { assertProvider } from "./storage.provider.js";
import { createSupabaseStorage } from "./supabase.storage.js";
import { createS3Storage } from "./s3.storage.js";
import { optimizeImage } from "./image-processor.js";

const drivers = {
  supabase: () => createSupabaseStorage(config.storage.supabase),
  s3: () => createS3Storage(config.storage.s3),
};

let provider;

function getProvider() {
  if (!provider) provider = assertProvider(drivers[config.storage.driver]());
  return provider;
}

const log = childLogger("storage");

const normalizeKey = (bucket, value) => value.replace(/^\/+/, "").replace(new RegExp(`^${bucket}/`), "");

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };

export const buckets = config.storage.buckets;

export const storage = {
  async uploadImage(bucket, original, { folder, preset } = {}) {
    const file = preset ? await optimizeImage(original, preset) : original;
    const ext = EXTENSIONS[file.mimetype] || "bin";
    const key = [folder, `${randomUUID()}.${ext}`].filter(Boolean).join("/");
    try {
      return await getProvider().upload(bucket, key, file.buffer, file.mimetype);
    } catch (err) {
      log.error({ err: err.message, bucket, driver: config.storage.driver }, "image upload failed");
      throw new AppError(502, "STORAGE_UPLOAD_FAILED", "Could not store the image, please try again");
    }
  },

  async remove(bucket, keys) {
    return getProvider().remove(bucket, keys.filter(Boolean));
  },

  /**
   * Stored values come in three shapes: a full URL (legacy rows), "<bucket>/<key>" (older SDK versions)
   * or a plain object key (current rows).
   */
  resolveUrl(bucket, value) {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    return getProvider().publicUrl(bucket, normalizeKey(bucket, value));
  },

  /**
   * Extracts the object key from a stored value so it can be deleted, whether it is a key or a public URL.
   */
  keyFromValue(bucket, value) {
    if (!value) return null;
    if (!/^https?:\/\//i.test(value)) return normalizeKey(bucket, value);
    const marker = `/${bucket}/`;
    const index = value.indexOf(marker);
    return index === -1 ? null : decodeURIComponent(value.slice(index + marker.length).split("?")[0]);
  },
};
