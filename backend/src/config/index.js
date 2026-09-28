import "dotenv/config";
import { z } from "zod";

const bool = (fallback) =>
  z
    .enum(["true", "false", "1", "0"])
    .default(fallback ? "true" : "false")
    .transform((v) => v === "true" || v === "1");

const list = (fallback) =>
  z
    .string()
    .default(fallback)
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );

const duration = z.coerce.number().int().positive();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVICE_NAME: z.string().default("social-api"),
  PORT: z.coerce.number().int().default(5000),
  API_PREFIX: z.string().default("/api/v1"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  TRUST_PROXY: z.string().default("1"),
  ENABLED_MODULES: list("*"),

  APP_URL: z.url().default("http://localhost:5173"),
  CORS_ORIGINS: list("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_KEY_PREFIX: z.string().default("social:"),

  RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
  RABBITMQ_PREFIX: z.string().default("social"),
  RABBITMQ_PREFETCH: z.coerce.number().int().positive().default(10),
  RABBITMQ_RETRY_DELAYS_MS: list("5000,30000,120000").transform((a) => a.map(Number)),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL_SECONDS: duration.default(900),
  JWT_ISSUER: z.string().default("social-api"),
  JWT_AUDIENCE: z.string().default("social-web"),
  REFRESH_TOKEN_TTL_DAYS: duration.default(30),
  REFRESH_COOKIE_NAME: z.string().default("rt"),
  COOKIE_SECURE: bool(false),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().optional(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  REQUIRE_EMAIL_VERIFICATION: bool(false),
  GOOGLE_CLIENT_ID: z.string().optional(),

  RATE_LIMIT_WINDOW_SECONDS: duration.default(900),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_SENSITIVE_MAX: z.coerce.number().int().positive().default(5),

  STORAGE_DRIVER: z.enum(["supabase", "s3"]).default("supabase"),
  STORAGE_BUCKET_POSTS: z.string().default("post-images"),
  STORAGE_BUCKET_AVATARS: z.string().default("avatars"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool(false),

  MAX_POST_IMAGES: z.coerce.number().int().min(1).max(10).default(4),
  ADMIN_USER_IDS: list("").transform((a) => a.map(Number).filter(Number.isInteger)),
  TURN_URLS: list(""),
  TURN_SECRET: z.string().optional(),
  TURN_TTL_SECONDS: duration.default(3600),
  STUN_URLS: list("stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"),
  FEED_SIZE: z.coerce.number().int().positive().default(300),
  FEED_TTL_SECONDS: duration.default(3600),
  ENABLE_LEGACY_GRAPHQL: bool(false),
  WORKERS: list("notifications,feed,analytics,scheduler"),
  EMBEDDED_WORKERS: list(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

const env = parsed.data;

if (env.STORAGE_DRIVER === "supabase" && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error("STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  serviceName: env.SERVICE_NAME,
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  logLevel: env.LOG_LEVEL,
  trustProxy: /^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY === "true",
  enabledModules: env.ENABLED_MODULES,
  appUrl: env.APP_URL.replace(/\/$/, ""),
  corsOrigins: env.CORS_ORIGINS,

  database: { url: env.DATABASE_URL },

  redis: { url: env.REDIS_URL, keyPrefix: env.REDIS_KEY_PREFIX },

  rabbitmq: {
    url: env.RABBITMQ_URL,
    prefix: env.RABBITMQ_PREFIX,
    prefetch: env.RABBITMQ_PREFETCH,
    retryDelaysMs: env.RABBITMQ_RETRY_DELAYS_MS,
  },

  auth: {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    bcryptRounds: env.BCRYPT_ROUNDS,
    maxFailedLogins: env.LOGIN_MAX_FAILED_ATTEMPTS,
    lockoutMinutes: env.LOGIN_LOCKOUT_MINUTES,
    emailVerificationTtlHours: env.EMAIL_VERIFICATION_TTL_HOURS,
    passwordResetTtlMinutes: env.PASSWORD_RESET_TTL_MINUTES,
    requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
    googleClientId: env.GOOGLE_CLIENT_ID,
    cookie: {
      name: env.REFRESH_COOKIE_NAME,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAMESITE,
      domain: env.COOKIE_DOMAIN || undefined,
      path: `${env.API_PREFIX}/auth`,
    },
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1000,
    max: env.RATE_LIMIT_MAX,
    authMax: env.RATE_LIMIT_AUTH_MAX,
    sensitiveMax: env.RATE_LIMIT_SENSITIVE_MAX,
  },

  storage: {
    driver: env.STORAGE_DRIVER,
    buckets: { posts: env.STORAGE_BUCKET_POSTS, avatars: env.STORAGE_BUCKET_AVATARS },
    maxUploadBytes: env.UPLOAD_MAX_BYTES,
    maxPostImages: env.MAX_POST_IMAGES,
    supabase: { url: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY },
    s3: {
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
  },

  feed: { size: env.FEED_SIZE, ttlSeconds: env.FEED_TTL_SECONDS },

  moderation: { adminUserIds: env.ADMIN_USER_IDS },

  rtc: {
    stunUrls: env.STUN_URLS,
    turnUrls: env.TURN_URLS,
    turnSecret: env.TURN_SECRET,
    turnTtlSeconds: env.TURN_TTL_SECONDS,
  },
  legacyGraphql: env.ENABLE_LEGACY_GRAPHQL,
  workers: env.WORKERS,
  embeddedWorkers: env.EMBEDDED_WORKERS,
});
