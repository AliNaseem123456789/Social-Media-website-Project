import multer from "multer";
import { config } from "#config";
import { AppError } from "./errors.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxUploadBytes, files: config.storage.maxPostImages + 1 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES.has(file.mimetype)) return cb(null, true);
    cb(AppError.badRequest("Only JPEG, PNG, GIF or WEBP images are allowed"));
  },
});

export const imageUpload = uploader;

export const singleImage = (field = "image") => uploader.single(field);

/**
 * Accepts the "images" array used by the composer and still tolerates a single "image" field so
 * older clients keep working. Files from either field land on req.files.
 */
export const postImages = () =>
  uploader.fields([
    { name: "images", maxCount: config.storage.maxPostImages },
    { name: "image", maxCount: 1 },
  ]);

export function collectImages(req) {
  const grouped = req.files;
  if (!grouped) return req.file ? [req.file] : [];
  if (Array.isArray(grouped)) return grouped;
  return [...(grouped.images ?? []), ...(grouped.image ?? [])].slice(0, config.storage.maxPostImages);
}
