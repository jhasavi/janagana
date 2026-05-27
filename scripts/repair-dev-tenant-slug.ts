import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function isProductionLike(host: string, database: string) {
  const signal = `${host} ${database}`;
  const prodTokens = ["prod", "production", "live", "primary"];
  const safeTokens = ["localhost", "127.0.0.1", "local", "dev", "test", "staging", "preview", "neon"];
  return prodTokens.some((token) => signal.includes(token)) && !safeTokens.some((token) => signal.includes(token));
}

function parseDatabaseUrl(raw: string | undefined) {
  if (!raw) return { host: "unknown", database: "unknown" };
  try {
    const url = new URL(raw);
    return {
      host: (url.hostname || "unknown").toLowerCase(),
      database: (url.pathname || "/").replace(/^\//, "").toLowerCase() || "unknown",
    };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run with NODE_ENV=production");
  }

  if (!process.argv.includes("--confirm")) {
    throw new Error("Refusing to run. Pass --confirm to repair the dev tenant slug.");
  }

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (isProductionLike(parsed.host, parsed.database)) {
    throw new Error(`Refusing production-like database target host=${parsed.host} db=${parsed.database}`);
  }

  const tenant = await prisma.tenant.findFirst({
    where: { name: "The Purple Wings" },
    select: { id: true, slug: true, clerkOrgId: true, name: true },
  });

  if (!tenant) {
    throw new Error("The Purple Wings tenant was not found in the dev database.");
  }

  const desiredSlug = "purple-wings";
  const slugOwner = await prisma.tenant.findFirst({
    where: { slug: desiredSlug },
    select: { id: true, name: true },
  });

  if (slugOwner && slugOwner.id !== tenant.id) {
    throw new Error(`Slug ${desiredSlug} is already in use by another tenant.`);
  }

  if (tenant.slug === desiredSlug) {
    console.log(`Slug already correct for ${tenant.name}: ${tenant.slug}`);
    return;
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { slug: desiredSlug },
  });

  console.log(`Updated tenant slug for ${tenant.name}`);
  console.log(`- tenantId: ${tenant.id}`);
  console.log(`- oldSlug: ${tenant.slug}`);
  console.log(`- newSlug: ${desiredSlug}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });