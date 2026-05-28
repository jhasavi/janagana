import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaLogLevels =
  process.env.PRISMA_LOG_QUERIES === "true"
    ? (["query", "warn"] as const)
    : process.env.NODE_ENV === "development"
      ? (["warn"] as const)
      : (["error"] as const);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [...prismaLogLevels],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
