import "dotenv/config";
import { z } from "zod";

const bool = (fallback) =>
  z
    .enum(["true", "false", "1", "0"])
    .default(fallback ? "true" : "false")
    .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVICE_NAME: z.string().default("email-service"),
  PORT: z.coerce.number().int().default(5001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
  RABBITMQ_PREFIX: z.string().default("social"),
  RABBITMQ_PREFETCH: z.coerce.number().int().positive().default(5),
  RABBITMQ_RETRY_DELAYS_MS: z
    .string()
    .default("10000,60000,300000")
    .transform((v) => v.split(",").map((s) => Number(s.trim())).filter(Boolean)),

  MAIL_TRANSPORT: z.enum(["smtp", "log"]).default("smtp"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM_NAME: z.string().default("Circle"),
  MAIL_FROM_ADDRESS: z.string().optional(),

  APP_NAME: z.string().default("Circle"),
  APP_URL: z.url().default("http://localhost:5173"),
  SUPPORT_EMAIL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}
const env = parsed.data;

if (env.MAIL_TRANSPORT === "smtp" && (!env.SMTP_USER || !env.SMTP_PASS)) {
  throw new Error("MAIL_TRANSPORT=smtp requires SMTP_USER and SMTP_PASS");
}

const prefix = env.RABBITMQ_PREFIX;

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  serviceName: env.SERVICE_NAME,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  rabbitmq: {
    url: env.RABBITMQ_URL,
    prefetch: env.RABBITMQ_PREFETCH,
    retryDelaysMs: env.RABBITMQ_RETRY_DELAYS_MS,
    exchange: `${prefix}.email`,
    queue: `${prefix}.email.outbox`,
  },
  mail: {
    transport: env.MAIL_TRANSPORT,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    },
    from: { name: env.MAIL_FROM_NAME, address: env.MAIL_FROM_ADDRESS || env.SMTP_USER || "no-reply@localhost" },
  },
  brand: {
    name: env.APP_NAME,
    url: env.APP_URL.replace(/\/$/, ""),
    supportEmail: env.SUPPORT_EMAIL || env.MAIL_FROM_ADDRESS || env.SMTP_USER || null,
  },
});
