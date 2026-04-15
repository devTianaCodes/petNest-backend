import type { Request, Response } from "express";
import { cloudinary } from "../../lib/cloudinary.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/http.js";

type UploadedFile = Express.Multer.File;

async function uploadBufferToCloudinary(file: UploadedFile, listingId: string) {
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "petnest/listings",
    public_id: `${listingId}-${Date.now()}-${file.originalname.replace(/\W+/g, "-").toLowerCase()}`,
    resource_type: "image"
  });

  return {
    cloudinaryPublicId: result.public_id,
    imageUrl: result.secure_url
  };
}

export async function uploadListingImages(req: Request, res: Response) {
  const listingId = String(req.params.id);
  const listing = await prisma.petListing.findUnique({
    where: { id: listingId },
    include: { images: true }
  });

  if (!listing || listing.ownerId !== req.user!.id) {
    throw new AppError(404, "Listing not found");
  }

  const files = (req.files as UploadedFile[] | undefined) ?? [];

  if (files.length === 0) {
    throw new AppError(400, "At least one image file is required");
  }

  if (listing.images.length + files.length > 3) {
    throw new AppError(400, "A listing can only have up to 3 images");
  }

  const uploads = await Promise.all(files.map((file) => uploadBufferToCloudinary(file, listingId)));

  const createdImages = await Promise.all(
    uploads.map((upload, index) =>
      prisma.petImage.create({
        data: {
          listingId,
          cloudinaryPublicId: upload.cloudinaryPublicId,
          imageUrl: upload.imageUrl,
          sortOrder: listing.images.length + index
        }
      })
    )
  );

  return res.status(201).json({ images: createdImages });
}

export async function deleteListingImage(req: Request, res: Response) {
  const imageId = String(req.params.imageId);
  const image = await prisma.petImage.findUnique({
    where: { id: imageId },
    include: { listing: true }
  });

  if (!image || image.listing.ownerId !== req.user!.id) {
    throw new AppError(404, "Image not found");
  }

  if (!image.cloudinaryPublicId.startsWith("external:")) {
    await cloudinary.uploader.destroy(image.cloudinaryPublicId, {
      resource_type: "image"
    });
  }

  await prisma.petImage.delete({
    where: { id: image.id }
  });

  return res.status(204).send();
}
