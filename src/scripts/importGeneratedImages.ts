import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma.js";

type PromptPack = {
  items?: Array<{
    listingId?: string;
    replacementImages?: string[];
  }>;
};

function isPublicUrl(value: string | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

async function main() {
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(process.cwd(), "../petnest-image-prompts.json");

  const raw = await readFile(inputPath, "utf8");
  const pack = JSON.parse(raw) as PromptPack;
  const items = pack.items ?? [];

  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const listingId = item.listingId;
    const urls = (item.replacementImages ?? []).filter((url): url is string => typeof url === "string");

    if (!listingId || urls.length < 2 || !isPublicUrl(urls[0]) || !isPublicUrl(urls[1])) {
      skipped += 1;
      continue;
    }

    const listing = await prisma.petListing.findUnique({
      where: { id: listingId },
      select: { id: true }
    });

    if (!listing) {
      skipped += 1;
      continue;
    }

    await prisma.$transaction([
      prisma.petImage.deleteMany({
        where: { listingId }
      }),
      prisma.petImage.createMany({
        data: urls.slice(0, 2).map((imageUrl, index) => ({
          listingId,
          cloudinaryPublicId: `external:${listingId}:${index}`,
          imageUrl,
          sortOrder: index
        }))
      })
    ]);

    updated += 1;
  }

  console.log(`Updated ${updated} listings from ${inputPath}. Skipped ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
