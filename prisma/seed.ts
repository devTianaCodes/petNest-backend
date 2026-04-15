import { ListingStatus, PetSex, PetSize, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const categories = [
  "Dog",
  "Cat",
  "Rabbit",
  "Bird",
  "Reptile",
  "Guinea Pig",
  "Hamster",
  "Ferret",
  "Other"
];

async function main() {
  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-")
      }
    });
  }

  const adminEmail = "admin@petnest.local";
  const passwordHash = await bcrypt.hash("Admin1234", 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: "PetNest Admin",
      email: adminEmail,
      passwordHash,
      isEmailVerified: true,
      role: UserRole.ADMIN
    }
  });

  const demoOwnerEmail = "rescuer@petnest.local";
  const demoOwner = await prisma.user.upsert({
    where: { email: demoOwnerEmail },
    update: {},
    create: {
      fullName: "Demo Rescuer",
      email: demoOwnerEmail,
      passwordHash,
      isEmailVerified: true,
      city: "Austin",
      state: "Texas"
    }
  });

  const dogCategory = await prisma.category.findUnique({ where: { slug: "dog" } });
  const catCategory = await prisma.category.findUnique({ where: { slug: "cat" } });

  if (dogCategory) {
    const dogListing = await prisma.petListing.upsert({
      where: { id: "demo-dog-listing" },
      update: {},
      create: {
        id: "demo-dog-listing",
        ownerId: demoOwner.id,
        categoryId: dogCategory.id,
        name: "Milo",
        description: "Milo is a gentle rescue dog who loves walks, naps, and calm homes.",
        ageLabel: "2 years",
        ageValue: 2,
        ageUnit: "YEARS",
        sex: PetSex.MALE,
        size: PetSize.MEDIUM,
        breedPrimary: "Mixed Breed",
        isMixedBreed: true,
        city: "Austin",
        state: "Texas",
        contactEmail: "rescuer@petnest.local",
        rescueStory: "Found abandoned and fostered back to health.",
        goodWithKids: true,
        goodWithDogs: true,
        vaccinated: true,
        houseTrained: true,
        status: ListingStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });

    await prisma.petImage.upsert({
      where: { id: "demo-dog-image" },
      update: {},
      create: {
        id: "demo-dog-image",
        listingId: dogListing.id,
        cloudinaryPublicId: "demo-dog-image",
        imageUrl: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 0
      }
    });
  }

  if (catCategory) {
    const catListing = await prisma.petListing.upsert({
      where: { id: "demo-cat-listing" },
      update: {},
      create: {
        id: "demo-cat-listing",
        ownerId: demoOwner.id,
        categoryId: catCategory.id,
        name: "Luna",
        description: "Luna is a calm rescued cat who would do well in a quiet apartment or family home.",
        ageLabel: "1 year",
        ageValue: 1,
        ageUnit: "YEARS",
        sex: PetSex.FEMALE,
        size: PetSize.SMALL,
        breedPrimary: "Domestic Shorthair",
        city: "Austin",
        state: "Texas",
        contactEmail: "rescuer@petnest.local",
        rescueStory: "Taken in from a neighborhood colony and socialized indoors.",
        goodWithKids: true,
        goodWithCats: true,
        vaccinated: true,
        spayedNeutered: true,
        status: ListingStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });

    await prisma.petImage.upsert({
      where: { id: "demo-cat-image" },
      update: {},
      create: {
        id: "demo-cat-image",
        listingId: catListing.id,
        cloudinaryPublicId: "demo-cat-image",
        imageUrl: "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 0
      }
    });
  }
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
