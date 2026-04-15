import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __petNestPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__petNestPrisma__ ??
  new PrismaClient({
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__petNestPrisma__ = prisma;
}
