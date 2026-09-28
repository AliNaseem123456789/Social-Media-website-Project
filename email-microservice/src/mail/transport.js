import nodemailer from "nodemailer";
import { config } from "../config/index.js";
import { logger } from "../logger.js";

const log = logger.child({ component: "mailer" });

function createTransport() {
  if (config.mail.transport === "log") return nodemailer.createTransport({ jsonTransport: true });
  return nodemailer.createTransport({ ...config.mail.smtp, pool: true, maxConnections: 3 });
}

const transporter = createTransport();

export async function verifyTransport() {
  if (config.mail.transport === "log") return true;
  await transporter.verify();
  return true;
}

export async function sendMail({ to, subject, html, text }) {
  const info = await transporter.sendMail({
    from: { name: config.mail.from.name, address: config.mail.from.address },
    to,
    subject,
    html,
    text,
  });
  if (config.mail.transport === "log") log.info({ subject }, "email rendered (log transport)");
  return info;
}

export function closeTransport() {
  transporter.close();
}
