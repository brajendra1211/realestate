import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./public/uploads";
const UPLOADS_URL_PREFIX = process.env.UPLOADS_URL_PREFIX ?? "/uploads";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_WIDTH = 1920;

const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024;

export class UploadValidationError extends Error {}

export async function saveUploadedImage(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadValidationError("Only JPEG, PNG, or WEBP images are allowed");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadValidationError("Image must be smaller than 8MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.webp`;
  const uploadsDir = path.resolve(process.cwd(), UPLOADS_DIR);
  await mkdir(uploadsDir, { recursive: true });

  const optimized = await sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  await writeFile(path.join(uploadsDir, filename), optimized);

  return {
    filename,
    url: `${UPLOADS_URL_PREFIX}/${filename}`,
  };
}

export async function saveUploadedDocument(file: File) {
  if (file.type !== "application/pdf") {
    throw new UploadValidationError("Only PDF files are allowed");
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new UploadValidationError("File must be smaller than 15MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.pdf`;
  const uploadsDir = path.resolve(process.cwd(), UPLOADS_DIR);
  await mkdir(uploadsDir, { recursive: true });

  await writeFile(path.join(uploadsDir, filename), buffer);

  return {
    filename,
    url: `${UPLOADS_URL_PREFIX}/${filename}`,
  };
}
