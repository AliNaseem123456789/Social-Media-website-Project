/**
 * Contract every storage driver implements.
 *
 * @typedef {Object} StoredObject
 * @property {string} bucket
 * @property {string} key
 * @property {string} url
 *
 * @typedef {Object} StorageProvider
 * @property {(bucket: string, key: string, body: Buffer, contentType: string) => Promise<StoredObject>} upload
 * @property {(bucket: string, keys: string[]) => Promise<void>} remove
 * @property {(bucket: string, key: string) => string} publicUrl
 */

export function assertProvider(provider) {
  for (const method of ["upload", "remove", "publicUrl"]) {
    if (typeof provider[method] !== "function") {
      throw new Error(`Storage provider is missing "${method}"`);
    }
  }
  return provider;
}
