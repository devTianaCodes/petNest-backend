import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "https://petnest-frontend.vercel.app";

const categoryImagePools: Record<string, string[]> = {
  Cat: [
    "/success-stories/story1A.png",
    "/success-stories/story1B.png",
    "/success-stories/story3A.png",
    "/success-stories/story3B.png"
  ],
  Dog: [
    "/success-stories/story2A.png",
    "/success-stories/story2B.png",
    "/success-stories/story4A.png",
    "/success-stories/story4B.png"
  ]
};

function imageFor(category: string, index: number) {
  const categoryImages = categoryImagePools[category];
  if (categoryImages?.length) {
    return `${frontendOrigin}${categoryImages[index % categoryImages.length]}`;
  }

  return `https://placehold.co/640x420/e6f1ea/2f5f4a?text=${encodeURIComponent(category)}`;
}

async function main() {
  const listings = await prisma.petListing.findMany({
    where: {
      id: {
        startsWith: "bulk-"
      }
    },
    include: {
      category: true
    },
    orderBy: {
      id: "asc"
    }
  });

  for (const [index, listing] of listings.entries()) {
    const imageUrl = imageFor(listing.category.name, index);

    await prisma.petImage.upsert({
      where: {
        id: `${listing.id}-image-1`
      },
      update: {
        imageUrl,
        sortOrder: 0
      },
      create: {
        id: `${listing.id}-image-1`,
        listingId: listing.id,
        cloudinaryPublicId: `database-demo:${listing.id}:1`,
        imageUrl,
        sortOrder: 0
      }
    });
  }

  console.log(`Updated ${listings.length} demo listing images.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
