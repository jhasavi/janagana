import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const REQUIRED_FLAG = "--confirm-reset-dev-data";

function parseDatabaseUrl(raw: string | undefined) {
  if (!raw) {
    return { host: "unknown", database: "unknown" };
  }

  try {
    const u = new URL(raw);
    return {
      host: (u.hostname || "unknown").toLowerCase(),
      database: (u.pathname || "/").replace(/^\//, "").toLowerCase() || "unknown",
    };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

function isProductionLike(host: string, database: string) {
  const signal = `${host} ${database}`;
  const prodTokens = ["prod", "production", "live", "primary"];
  const safeTokens = ["localhost", "127.0.0.1", "local", "dev", "test", "staging", "preview", "neon"];
  const hasProd = prodTokens.some((t) => signal.includes(t));
  const hasSafe = safeTokens.some((t) => signal.includes(t));
  return hasProd && !hasSafe;
}

async function main() {
  if (!process.argv.includes(REQUIRED_FLAG)) {
    throw new Error(`Refusing to reset data. Re-run with ${REQUIRED_FLAG}`);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run with NODE_ENV=production");
  }

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (isProductionLike(parsed.host, parsed.database)) {
    throw new Error(`Refusing production-like database target host=${parsed.host} db=${parsed.database}`);
  }

  console.log("Resetting v3 dev app data");
  console.log(`- host: ${parsed.host}`);
  console.log(`- database: ${parsed.database}`);

  await prisma.auditLog.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.membershipTier.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.tenantAdmin.deleteMany();
  await prisma.tenant.deleteMany();

  console.log("Reset complete for v3 app tables only");
  console.log("No Clerk API calls were made");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
