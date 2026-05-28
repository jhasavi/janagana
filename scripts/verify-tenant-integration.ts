import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

const REQUIRED_TENANTS = [
  { slug: "purple-wings", name: "The Purple Wings" },
  { slug: "namaste-boston", name: "Namaste Boston" },
] as const;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  console.log("Tenant integration verification");
  let failed = false;

  for (const expected of REQUIRED_TENANTS) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: expected.slug },
      select: { id: true, slug: true, name: true, status: true, clerkOrgId: true },
    });

    if (!tenant) {
      console.error(`- FAIL ${expected.slug}: tenant row missing`);
      console.error(`  Fix: npm run seed:e2e  OR  complete owner onboarding with slug "${expected.slug}"`);
      failed = true;
      continue;
    }

    if (tenant.status !== "ACTIVE") {
      console.error(`- FAIL ${expected.slug}: status is ${tenant.status}, expected ACTIVE`);
      failed = true;
      continue;
    }

    if (!tenant.clerkOrgId || tenant.clerkOrgId.startsWith("e2e_")) {
      console.warn(`- WARN ${expected.slug}: clerkOrgId looks like test placeholder (${tenant.clerkOrgId})`);
      console.warn("  For production, map a real Clerk organization via onboarding or setup:namaste");
    }

    const publishedEvents = await prisma.event.count({
      where: { tenantId: tenant.id, status: "PUBLISHED" },
    });

    console.log(`- OK ${expected.slug}: name="${tenant.name}" clerkOrgId=${tenant.clerkOrgId} publishedEvents=${publishedEvents}`);

    if (tenant.name !== expected.name) {
      console.warn(`  WARN: display name is "${tenant.name}", docs expect "${expected.name}"`);
    }
  }

  if (process.env.CLERK_SECRET_KEY) {
    try {
      const response = await fetch("https://api.clerk.com/v1/organizations?limit=100", {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });
      if (response.ok) {
        const payload = await response.json();
        const orgs = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
        const slugs = new Set(orgs.map((o: { slug?: string }) => o.slug).filter(Boolean));
        for (const expected of REQUIRED_TENANTS) {
          if (!slugs.has(expected.slug)) {
            console.warn(`- WARN Clerk org slug "${expected.slug}" not found in first 100 orgs (may use different slug in Clerk)`);
          }
        }
      }
    } catch {
      console.warn("- WARN: could not verify Clerk org slugs (network or API error)");
    }
  } else {
    console.warn("- SKIP Clerk API check (CLERK_SECRET_KEY missing)");
  }

  if (failed) {
    process.exitCode = 1;
    console.error("\nverify:tenants FAILED — fix missing tenants before go-live");
    return;
  }

  console.log("\nverify:tenants PASS");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
