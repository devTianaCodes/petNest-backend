import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AgeUnit, EnergyLevel, ListingStatus, PetSex, PetSize, PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const categories = ["Dog", "Cat", "Rabbit", "Bird", "Reptile", "Guinea Pig", "Hamster", "Ferret", "Other"];

type DemoAnimal = {
  listingId: string;
  name: string;
  category: string;
  ageLabel: string;
  sex: PetSex;
  breedLabel: string;
  city: string;
  state: string;
  description: string;
  rescueStory: string;
  healthNotes: string;
  replacementImages: string[];
};

async function main() {
  await seedCategories();
  const passwordHash = await bcrypt.hash("Admin1234", 12);
  const admin = await seedAdmin(passwordHash);
  const owner = await seedOwner(passwordHash);
  await archiveLegacyTinySeed();
  await seedDemoAnimals(owner.id, admin.id);
}

async function seedCategories() {
  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: slugFor(name) },
      update: {},
      create: { name, slug: slugFor(name) }
    });
  }
}

function slugFor(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

async function seedAdmin(passwordHash: string) {
  return prisma.user.upsert({
    where: { email: "admin@petnest.local" },
    update: {
      fullName: "PetNest Admin",
      passwordHash,
      isEmailVerified: true,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    },
    create: {
      fullName: "PetNest Admin",
      email: "admin@petnest.local",
      passwordHash,
      isEmailVerified: true,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    }
  });
}

async function seedOwner(passwordHash: string) {
  return prisma.user.upsert({
    where: { email: "rescuer@petnest.local" },
    update: {
      fullName: "Demo Rescuer",
      passwordHash,
      isEmailVerified: true,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      city: "Austin",
      state: "Texas"
    },
    create: {
      fullName: "Demo Rescuer",
      email: "rescuer@petnest.local",
      passwordHash,
      isEmailVerified: true,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      city: "Austin",
      state: "Texas"
    }
  });
}

async function archiveLegacyTinySeed() {
  await prisma.petListing.updateMany({
    where: { id: { in: ["demo-dog-listing", "demo-cat-listing"] } },
    data: { status: ListingStatus.ARCHIVED }
  });
}

async function seedDemoAnimals(ownerId: string, adminId: string) {
  const animals = loadDemoAnimals();
  for (const [index, animal] of animals.entries()) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: slugFor(animal.category) } });
    await upsertAnimalListing(animal, index, ownerId, adminId, category.id);
  }
}

function loadDemoAnimals() {
  const seedPath = findPromptPackPath();
  const promptPack = JSON.parse(readFileSync(seedPath, "utf8")) as { items: DemoAnimal[] };
  return promptPack.items;
}

function findPromptPackPath() {
  const currentFile = fileURLToPath(import.meta.url);
  const candidates = [
    path.resolve(process.cwd(), "petnest-image-prompts.json"),
    path.resolve(process.cwd(), "..", "petnest-image-prompts.json"),
    path.resolve(path.dirname(currentFile), "..", "..", "..", "petnest-image-prompts.json")
  ];
  const seedPath = candidates.find((candidate) => existsSync(candidate));
  if (!seedPath) {
    throw new Error("petnest-image-prompts.json not found");
  }
  return seedPath;
}

async function upsertAnimalListing(animal: DemoAnimal, index: number, ownerId: string, adminId: string, categoryId: string) {
  await prisma.petListing.upsert({
    where: { id: animal.listingId },
    update: listingData(animal, index, ownerId, adminId, categoryId),
    create: { id: animal.listingId, ...listingData(animal, index, ownerId, adminId, categoryId) }
  });
  await upsertAnimalImage(animal, index);
}

function listingData(animal: DemoAnimal, index: number, ownerId: string, adminId: string, categoryId: string) {
  return {
    ownerId,
    categoryId,
    approvedByAdminId: adminId,
    name: animal.name,
    description: animal.description,
    ageLabel: animal.ageLabel,
    ageValue: Number(animal.ageLabel.match(/\d+/)?.[0] ?? 1),
    ageUnit: AgeUnit.YEARS,
    sex: animal.sex,
    size: sizeFor(animal.category, index),
    breedPrimary: breedFor(animal.breedLabel),
    isMixedBreed: /mixed|unknown/i.test(animal.breedLabel),
    energyLevel: [EnergyLevel.LOW, EnergyLevel.MEDIUM, EnergyLevel.HIGH][index % 3],
    houseTrained: index % 2 === 0,
    spayedNeutered: index % 3 !== 0,
    vaccinated: true,
    city: animal.city,
    state: animal.state,
    contactEmail: "rescuer@petnest.local",
    rescueStory: animal.rescueStory,
    healthNotes: animal.healthNotes,
    goodWithKids: index % 3 === 0,
    goodWithDogs: animal.category === "Dog",
    goodWithCats: animal.category === "Cat",
    status: ListingStatus.PUBLISHED,
    rejectionReason: null,
    publishedAt: new Date(),
    approvedAt: new Date()
  };
}

function breedFor(breedLabel: string) {
  return /mixed|unknown/i.test(breedLabel) ? "Mixed Breed" : breedLabel;
}

function sizeFor(category: string, index: number) {
  if (category === "Dog") {
    return [PetSize.SMALL, PetSize.MEDIUM, PetSize.LARGE][index % 3];
  }
  return category === "Cat" ? [PetSize.SMALL, PetSize.MEDIUM][index % 2] : PetSize.SMALL;
}

async function upsertAnimalImage(animal: DemoAnimal, index: number) {
  const imageUrl = imageFor(animal);
  if (!imageUrl) {
    return;
  }

  await prisma.petImage.upsert({
    where: { id: `${animal.listingId}-image-1` },
    update: { imageUrl, sortOrder: 0 },
    create: {
      id: `${animal.listingId}-image-1`,
      listingId: animal.listingId,
      cloudinaryPublicId: `${animal.listingId}-image-1`,
      imageUrl,
      sortOrder: 0
    }
  });
}

function imageFor(animal: DemoAnimal) {
  return animal.replacementImages.find(Boolean);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
