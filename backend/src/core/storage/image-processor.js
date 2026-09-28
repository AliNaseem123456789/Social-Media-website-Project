import sharp from "sharp";
import { childLogger } from "#core/logger/index.js";

const log = childLogger("images");

const PRESETS = {
  avatar: { width: 400, height: 400, fit: "cover", quality: 82 },
  cover: { width: 1600, height: 600, fit: "cover", quality: 80 },
  post: { width: 1600, height: 1600, fit: "inside", quality: 82 },
};

/**
 * Resizes and re-encodes an uploaded image to WebP. Animated GIFs and unreadable files are returned
 * unchanged so an optimisation failure never blocks the upload.
 */
export async function optimizeImage(file, presetName) {
  const preset = PRESETS[presetName];
  if (!preset || file.mimetype === "image/gif") return file;
  try {
    const buffer = await sharp(file.buffer, { failOn: "error" })
      .rotate()
      .resize({ width: preset.width, height: preset.height, fit: preset.fit, withoutEnlargement: true })
      .webp({ quality: preset.quality })
      .toBuffer();
    return { ...file, buffer, mimetype: "image/webp", size: buffer.length };
  } catch (err) {
    log.warn({ err: err.message }, "image optimisation skipped");
    return file;
  }
}
