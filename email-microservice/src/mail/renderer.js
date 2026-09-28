import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { config } from "../config/index.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "templates");
const hbs = Handlebars.create();

const templates = {};
for (const file of readdirSync(dir).filter((f) => f.endsWith(".hbs"))) {
  const name = file.replace(/\.hbs$/, "");
  const source = readFileSync(join(dir, file), "utf8");
  if (name.startsWith("_")) hbs.registerPartial(name.slice(1), source);
  else templates[name] = hbs.compile(source, { strict: false });
}

export function hasTemplate(name) {
  return Boolean(templates[name]) && name !== "layout";
}

/**
 * Renders a template inside the shared layout. Handlebars escapes every {{value}}, so user supplied
 * text (comments, messages, names) can never inject markup into the email.
 */
export function render(name, data, { subject, preheader }) {
  const context = { ...data, brand: config.brand, year: new Date().getFullYear() };
  const body = templates[name](context);
  return templates.layout({ ...context, body, subject, preheader: preheader ?? subject });
}
