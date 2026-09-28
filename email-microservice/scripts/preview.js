import { mkdirSync, writeFileSync } from "node:fs";

process.env.MAIL_TRANSPORT ??= "log";

const { buildEmail, SUPPORTED_TYPES } = await import("../src/handlers/index.js");

const sample = {
  to: "jane@example.com",
  name: "Jane",
  actorName: "Sam",
  profileUrl: "http://localhost:5173/onboarding",
  verificationUrl: "http://localhost:5173/verify-email?token=sample",
  resetUrl: "http://localhost:5173/reset-password?token=sample",
  expiresInHours: 24,
  expiresInMinutes: 30,
  messagePreview: "Hey! Are we still on for Saturday?",
  conversationUrl: "http://localhost:5173/messages/2",
  postPreview: "Sunset from the rooftop tonight",
  commentPreview: "This is <b>stunning</b>, where was it taken?",
  postUrl: "http://localhost:5173/posts/1",
  requestsUrl: "http://localhost:5173/friends/requests",
};

mkdirSync("preview", { recursive: true });
for (const type of SUPPORTED_TYPES) {
  const email = buildEmail(type, sample);
  writeFileSync(`preview/${type}.html`, email.html);
}
console.log(`Wrote ${SUPPORTED_TYPES.length} previews to ./preview`);
