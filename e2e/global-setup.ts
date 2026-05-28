import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

const E2E_TENANTS = [
  {
    slug: "purple-wings",
    name: "The Purple Wings",
    clerkOrgId: "e2e_purple_wings_org",
  },
  {
    slug: "namaste-boston",
    name: "Namaste Boston",
    clerkOrgId: "e2e_namaste_boston_org",
  },
] as const;

export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Playwright global setup.");
  }

  for (const tenant of E2E_TENANTS) {
    await prisma.tenant.upsert({
      where: { slug: tenant.slug },
      update: {
        name: tenant.name,
        status: "ACTIVE",
      },
      create: {
        slug: tenant.slug,
        name: tenant.name,
        clerkOrgId: tenant.clerkOrgId,
        status: "ACTIVE",
      },
    });
  }

  await prisma.$disconnect();
}

if (process.argv[1]?.endsWith("global-setup.ts")) {
  globalSetup().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
