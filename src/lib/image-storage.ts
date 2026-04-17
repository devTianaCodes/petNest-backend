import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Request } from "express";
import { cloudinary } from "./cloudinary.js";
import { env } from "../config/env.js";

type UploadedFile = Express.Multer.File;

const uploadsDir = path.resolve(process.cwd(), "uploads", "listings");

export function isCloudinaryConfigured() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function sanitizeFileName(value: string) {
  return value.replace(/\W+/g, "-").toLowerCase();
}

function buildLocalImageUrl(req: Request, fileName: string) {
  return `${req.protocol}://${req.get("host")}/uploads/listings/${fileName}`;
}

async function uploadToCloudinary(file: UploadedFile, listingId: string) {
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "petnest/listings",
    public_id: `${listingId}-${Date.now()}-${sanitizeFileName(file.originalname)}`,
    resource_type: "image"
  });

  return {
    storageId: result.public_id,
    imageUrl: result.secure_url
  };
}

async function uploadToLocalDisk(req: Request, file: UploadedFile, listingId: string) {
  await mkdir(uploadsDir, { recursive: true });
  const extension = path.extname(file.originalname) || ".jpg";
  const fileName = `${listingId}-${Date.now()}-${sanitizeFileName(path.basename(file.originalname, extension))}${extension.toLowerCase()}`;
  const outputPath = path.join(uploadsDir, fileName);

  await writeFile(outputPath, file.buffer);

  return {
    storageId: `local:${fileName}`,
    imageUrl: buildLocalImageUrl(req, fileName)
  };
}

export async function uploadImage(req: Request, file: UploadedFile, listingId: string) {
  if (isCloudinaryConfigured()) {
    return uploadToCloudinary(file, listingId);
  }

  return uploadToLocalDisk(req, file, listingId);
}

export async function deleteStoredImage(storageId: string) {
  if (storageId.startsWith("external:")) {
    return;
  }

  if (storageId.startsWith("local:")) {
    const fileName = storageId.slice("local:".length);
    await unlink(path.join(uploadsDir, fileName)).catch(() => undefined);
    return;
  }

  await cloudinary.uploader.destroy(storageId, {
    resource_type: "image"
  });
}
