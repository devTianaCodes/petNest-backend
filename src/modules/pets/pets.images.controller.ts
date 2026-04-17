import type { Request, Response } from "express";
import { deleteStoredImage, uploadImage } from "../../lib/image-storage.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/http.js";

type UploadedFile = Express.Multer.File;

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

  const uploads = await Promise.all(files.map((file) => uploadImage(req, file, listingId)));

  const createdImages = await Promise.all(
    uploads.map((upload, index) =>
      prisma.petImage.create({
        data: {
          listingId,
          cloudinaryPublicId: upload.storageId,
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

  await deleteStoredImage(image.cloudinaryPublicId);

  await prisma.petImage.delete({
    where: { id: image.id }
  });

  return res.status(204).send();
}
