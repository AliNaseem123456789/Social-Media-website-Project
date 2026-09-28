import { z } from "zod";
import { config } from "../config/index.js";
import { render } from "../mail/renderer.js";
import { sendMail } from "../mail/transport.js";
import { logger } from "../logger.js";
import { PermanentError } from "../messaging/consumer.js";

const log = logger.child({ component: "handlers" });

const base = z.object({ to: z.email(), name: z.string().min(1).max(100) });
const url = z.url();
const text = (max) => z.string().max(max).optional().default("");

/**
 * Each email type declares its payload schema, subject and a plain text fallback.
 * The HTML body comes from templates/<type>.hbs.
 */
const EMAILS = {
  welcome: {
    schema: base.extend({ profileUrl: url }),
    subject: () => `Welcome to ${config.brand.name}`,
    text: (d) => `Welcome to ${config.brand.name}, ${d.name}! Set up your profile: ${d.profileUrl}`,
  },
  "verify-email": {
    schema: base.extend({ verificationUrl: url, expiresInHours: z.number().int().positive() }),
    subject: () => "Confirm your email address",
    text: (d) => `Hi ${d.name}, confirm your email: ${d.verificationUrl} (expires in ${d.expiresInHours} hours)`,
  },
  "password-reset": {
    schema: base.extend({ resetUrl: url, expiresInMinutes: z.number().int().positive() }),
    subject: () => "Reset your password",
    text: (d) => `Hi ${d.name}, reset your password: ${d.resetUrl} (expires in ${d.expiresInMinutes} minutes)`,
  },
  "password-changed": {
    schema: base,
    subject: () => "Your password was changed",
    extra: () => ({ forgotUrl: `${config.brand.url}/forgot-password` }),
    text: (d) => `Hi ${d.name}, your password was changed. If this wasn't you, reset it: ${config.brand.url}/forgot-password`,
  },
  "new-message": {
    schema: base.extend({ actorName: z.string(), messagePreview: text(300), conversationUrl: url }),
    subject: (d) => `New message from ${d.actorName}`,
    text: (d) => `${d.actorName} sent you a message: "${d.messagePreview}". Reply: ${d.conversationUrl}`,
  },
  "post-like": {
    schema: base.extend({ actorName: z.string(), postPreview: text(300), postUrl: url }),
    subject: (d) => `${d.actorName} liked your post`,
    text: (d) => `${d.actorName} liked your post. View it: ${d.postUrl}`,
  },
  comment: {
    schema: base.extend({ actorName: z.string(), commentPreview: text(400), postPreview: text(300), postUrl: url }),
    subject: (d) => `${d.actorName} commented on your post`,
    text: (d) => `${d.actorName} commented: "${d.commentPreview}". View: ${d.postUrl}`,
  },
  "email-changed": {
    schema: base.extend({ newEmail: z.email(), pending: z.boolean().default(false), supportUrl: url }),
    subject: (d) => (d.pending ? "Confirm your new email address" : "Your email address was changed"),
    text: (d) =>
      d.pending
        ? `Hi ${d.name}, an email change to ${d.newEmail} was requested. It only takes effect once that address confirms it. If this wasn't you, change your password: ${d.supportUrl}`
        : `Hi ${d.name}, your account now uses ${d.newEmail}. If this wasn't you, reset your password: ${d.supportUrl}`,
  },
  mention: {
    schema: base.extend({ actorName: z.string(), textPreview: text(400), postUrl: url }),
    subject: (d) => `${d.actorName} mentioned you`,
    text: (d) => `${d.actorName} mentioned you: "${d.textPreview}". View: ${d.postUrl}`,
  },
  "friend-request": {
    schema: base.extend({ actorName: z.string(), requestsUrl: url }),
    subject: (d) => `${d.actorName} sent you a friend request`,
    text: (d) => `${d.actorName} sent you a friend request. Review it: ${d.requestsUrl}`,
  },
};

export const SUPPORTED_TYPES = Object.keys(EMAILS);

export function buildEmail(type, payload) {
  const definition = EMAILS[type];
  if (!definition) throw new PermanentError(`Unsupported email type "${type}"`);

  const parsed = definition.schema.safeParse(payload);
  if (!parsed.success) {
    throw new PermanentError(`Invalid payload for "${type}": ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }

  const data = { ...parsed.data, ...(definition.extra?.(parsed.data) ?? {}) };
  const subject = definition.subject(data);
  return {
    to: data.to,
    subject,
    html: render(type, data, { subject }),
    text: definition.text(data),
  };
}

export async function handleEmailJob(envelope, { routingKey }) {
  const type = envelope.type || routingKey;
  const email = buildEmail(type, envelope.data);
  await sendMail(email);
  log.info({ type, id: envelope.id }, "email sent");
}
