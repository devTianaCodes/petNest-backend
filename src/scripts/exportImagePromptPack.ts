import "dotenv/config";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ListingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type PromptItem = {
  listingId: string;
  name: string;
  category: string;
  ageLabel: string;
  sex: string;
  breedLabel: string;
  city: string;
  state: string;
  description: string;
  rescueStory: string | null;
  healthNotes: string | null;
  prompts: [string, string];
  replacementImages: [string, string];
};

function sentenceCase(value: string | null | undefined) {
  if (!value) {
    return "unknown";
  }

  return value.toLowerCase().replace(/_/g, " ");
}

function compactText(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function buildPromptBase(item: PromptItem) {
  return compactText(
    "Hyperrealistic rescue pet adoption photo.",
    `${item.name} is a ${item.ageLabel} ${sentenceCase(item.sex)} ${item.category.toLowerCase()}.`,
    item.breedLabel !== "Mixed Breed" ? `Breed details: ${item.breedLabel}.` : "Mixed breed or unknown breed.",
    `Location context: ${item.city}, ${item.state}.`,
    `Profile notes: ${item.description}`,
    item.rescueStory ? `Rescue story: ${item.rescueStory}` : null,
    item.healthNotes ? `Health notes: ${item.healthNotes}` : null,
    "Focus on one animal only, no humans, no collars with text, no cage bars blocking the face, no watermark, natural anatomy, realistic fur, realistic eyes, soft natural lighting, portfolio-quality photography."
  );
}

function buildPromptSet(item: PromptItem): [string, string] {
  const base = buildPromptBase(item);

  return [
    `${base} Shot 1: front three-quarter portrait, animal looking at camera, clean background, shallow depth of field, rescue campaign style.`,
    `${base} Shot 2: alternate angle, full body standing or sitting naturally, slightly different expression and pose, realistic home-or-garden setting, premium adoption website style.`
  ];
}

async function main() {
  const outputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(process.cwd(), "../petnest-image-prompts.json");

  const listings = await prisma.petListing.findMany({
    where: { status: ListingStatus.PUBLISHED },
    include: { category: true },
    orderBy: { name: "asc" }
  });

  const items: PromptItem[] = listings.map((listing) => {
    const breedLabel = [listing.breedPrimary, listing.breedSecondary].filter(Boolean).join(" / ") || "Mixed Breed";
    const item: PromptItem = {
      listingId: listing.id,
      name: listing.name,
      category: listing.category.name,
      ageLabel: listing.ageLabel,
      sex: listing.sex,
      breedLabel,
      city: listing.city,
      state: listing.state,
      description: listing.description,
      rescueStory: listing.rescueStory,
      healthNotes: listing.healthNotes,
      prompts: ["", ""],
      replacementImages: ["", ""]
    };

    item.prompts = buildPromptSet(item);
    return item;
  });

  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        instructions:
          "Generate two different hyperrealistic images per animal. Paste the final public image URLs into replacementImages[0] and replacementImages[1], then run the import script.",
        items
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`Wrote prompt pack for ${items.length} animals to ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
