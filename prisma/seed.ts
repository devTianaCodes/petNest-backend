import { PrismaClient, UserRole } from "@prisma/client";
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
