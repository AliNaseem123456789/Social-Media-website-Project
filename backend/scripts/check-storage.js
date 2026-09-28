import { config } from "#config";
import { storage, buckets } from "#core/storage/index.js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const line = (label, value) => console.log(`${label.padEnd(22)} ${value}`);

async function listSupabaseBuckets() {
  const response = await fetch(`${config.storage.supabase.url.replace(/\/$/, "")}/storage/v1/bucket`, {
    headers: {
      authorization: `Bearer ${config.storage.supabase.serviceRoleKey}`,
      apikey: config.storage.supabase.serviceRoleKey,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 200)}`);
  return response.json();
}

async function checkBucket(bucket) {
  const file = { buffer: PNG, mimetype: "image/png", originalname: "healthcheck.png" };
  const stored = await storage.uploadImage(bucket, file, { folder: "healthcheck" });
  line("  uploaded", stored.key);
  line("  public url", stored.url);

  const fetched = await fetch(stored.url, { signal: AbortSignal.timeout(15000) });
  line("  public read", fetched.ok ? "ok" : `FAILED (${fetched.status}) - is the bucket public?`);

  await storage.remove(bucket, [stored.key]);
  line("  cleanup", "deleted");
}

async function main() {
  line("driver", config.storage.driver);
  if (config.storage.driver === "supabase") line("supabase url", config.storage.supabase.url);
  line("buckets", `posts=${buckets.posts} avatars=${buckets.avatars}`);
  console.log();

  if (config.storage.driver === "supabase") {
    try {
      const existing = await listSupabaseBuckets();
      line("buckets found", existing.map((b) => `${b.name}${b.public ? " (public)" : " (private)"}`).join(", ") || "none");
      for (const needed of [buckets.posts, buckets.avatars]) {
        const found = existing.find((b) => b.name === needed);
        if (!found) line("MISSING BUCKET", `${needed} - create it in Supabase > Storage`);
        else if (!found.public) line("NOT PUBLIC", `${needed} - images will not load in the browser`);
      }
    } catch (err) {
      line("bucket listing", `failed: ${err.message}`);
    }
    console.log();
  }

  for (const bucket of [buckets.posts, buckets.avatars]) {
    console.log(`bucket: ${bucket}`);
    try {
      await checkBucket(bucket);
    } catch (err) {
      line("  ERROR", err.message);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
