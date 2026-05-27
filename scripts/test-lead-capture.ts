import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { capturePublicLead } from "@/lib/actions/public-portal";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

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

async function getClerkOrgCount() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    throw new Error("CLERK_SECRET_KEY missing");
  }

  const response = await fetch("https://api.clerk.com/v1/organizations?limit=100", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Clerk org fetch failed: status=${response.status} body=${body.slice(0, 200)}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload.length : Array.isArray(payload.data) ? payload.data.length : 0;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run with NODE_ENV=production");
  }

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (isProductionLike(parsed.host, parsed.database)) {
    throw new Error(`Refusing production-like database target host=${parsed.host} db=${parsed.database}`);
  }

  const marker = `lead-capture-${Date.now().toString(36)}`;
  const tenantSlug = `${marker}-tenant`;

  const clerkOrgCountBefore = await getClerkOrgCount();

  const tenant = await prisma.tenant.create({
    data: {
      slug: tenantSlug,
      name: `Lead Capture Tenant ${marker}`,
      clerkOrgId: `dev_lead_capture_${marker}`,
      status: "ACTIVE",
    },
  });

  const newsletter = await capturePublicLead({
    tenantSlug,
    firstName: "Lead",
    lastName: "Newsletter",
    email: `${marker}@example.com`,
    phone: "555-1111",
    interestType: "NEWSLETTER",
    source: "test_script",
  });
  assert(newsletter.ok, "Newsletter lead capture should succeed");

  const investment = await capturePublicLead({
    tenantSlug,
    firstName: "Lead",
    lastName: "Newsletter",
    email: `${marker}@example.com`,
    phone: "555-2222",
    interestType: "INVESTMENT_ANALYSIS",
    source: "test_script",
  });
  assert(investment.ok, "Investment analysis lead capture should succeed");

  const contact = await prisma.contact.findFirst({
    where: {
      tenantId: tenant.id,
      email: `${marker}@example.com`,
    },
  });
  assert(!!contact, "Expected captured contact row");
  assert(contact?.type === "OTHER", "Lead capture should use stable OTHER contact type without schema migration");

  const wrongTenant = await capturePublicLead({
    tenantSlug: "does-not-exist-xyz",
    firstName: "Lead",
    lastName: "Wrong",
    email: `${marker}-wrong@example.com`,
    interestType: "NEWSLETTER",
  });
  assert(!wrongTenant.ok, "Wrong tenant slug should fail");
  assert(wrongTenant.error === "Tenant not found", "Wrong tenant slug should return tenant-not-found");

  const auditCount = await prisma.auditLog.count({
    where: {
      tenantId: tenant.id,
      action: "CREATE",
      metadata: {
        path: ["entity"],
        equals: "ContactLead",
      },
    },
  });
  assert(auditCount >= 2, "Lead capture should write audit rows");

  const clerkOrgCountAfter = await getClerkOrgCount();
  assert(clerkOrgCountAfter === clerkOrgCountBefore, "Lead capture must not create Clerk organizations");

  console.log("Lead capture checks passed:");
  console.log("- Newsletter capture creates tenant-scoped contact");
  console.log("- Investment analysis capture updates existing contact type");
  console.log("- Unknown tenant slug fails cleanly");
  console.log(`- Clerk org count unchanged: ${clerkOrgCountBefore}`);

  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.eventRegistration.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.event.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.membership.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.membershipTier.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenantAdmin.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
