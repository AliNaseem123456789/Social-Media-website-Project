const encodePath = (key) => key.split("/").map(encodeURIComponent).join("/");

/**
 * Talks to the Supabase Storage REST API directly. The supabase-js SDK is not used on purpose:
 * it pulls in a realtime client that needs a native WebSocket (Node 22+) even when only storage is used.
 */
export function createSupabaseStorage({ url, serviceRoleKey }) {
  const baseUrl = url.replace(/\/$/, "");
  const headers = { authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey };

  async function request(method, path, { body, contentType, extraHeaders } = {}) {
    const response = await fetch(`${baseUrl}/storage/v1${path}`, {
      method,
      headers: { ...headers, ...(contentType ? { "content-type": contentType } : {}), ...extraHeaders },
      body,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Supabase storage ${method} ${path} failed (${response.status}): ${detail.slice(0, 200)}`);
    }
    return response;
  }

  const publicUrl = (bucket, key) => `${baseUrl}/storage/v1/object/public/${bucket}/${encodePath(key)}`;

  return {
    name: "supabase",

    async upload(bucket, key, body, contentType) {
      await request("POST", `/object/${bucket}/${encodePath(key)}`, {
        body,
        contentType,
        extraHeaders: { "x-upsert": "true", "cache-control": "max-age=3600" },
      });
      return { bucket, key, url: publicUrl(bucket, key) };
    },

    async remove(bucket, keys) {
      if (!keys.length) return;
      await request("DELETE", `/object/${bucket}`, {
        body: JSON.stringify({ prefixes: keys }),
        contentType: "application/json",
      });
    },

    publicUrl,
  };
}
