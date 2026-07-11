#!/usr/bin/env tsx
/**
 * Automated pilot sign-off checks (Part A/B — machine-verifiable items).
 *
 *   npm run verify:pilot-signoff
 *   npm run verify:pilot-signoff -- --base-url=https://janagana.namasteneedham.com
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { configuredAppUrl } from "@/lib/environment";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const prisma = new PrismaClient();

const PILOT_TENANTS = [
  { slug: "purple-wings", label: "The Purple Wings" },
  { slug: "namaste-boston", label: "Namaste Boston" },
] as const;

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    if (value) out[key] = value;
  }
  return out;
}

async function checkHttp(url: string, label: string) {
  try {
    const response = await fetch(url, { redirect: "follow" });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? "OK" : "FAIL"} ${label}: ${response.status}`);
    return ok;
  } catch (error) {
    console.log(`FAIL ${label}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (args["base-url"] ?? configuredAppUrl()).replace(/\/$/, "");
  let failed = false;

  console.log("Pilot sign-off verification (automated Part A/B)");
  console.log(`Base URL: ${baseUrl}\n`);

  for (const pilot of PILOT_TENANTS) {
    console.log(`--- ${pilot.label} (${pilot.slug}) ---`);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: pilot.slug },
      select: { id: true, slug: true, status: true, clerkOrgId: true },
    });

    if (!tenant || tenant.status !== "ACTIVE") {
      console.log(`FAIL tenant: missing or inactive`);
      failed = true;
      continue;
    }
    console.log(`OK tenant: active clerkOrgId=${tenant.clerkOrgId}`);

    const [contacts, publishedEvents, registrations] = await Promise.all([
      prisma.contact.count({ where: { tenantId: tenant.id } }),
      prisma.event.count({ where: { tenantId: tenant.id, status: "PUBLISHED" } }),
      prisma.eventRegistration.count({ where: { tenantId: tenant.id } }),
    ]);

    console.log(`OK data: contacts=${contacts} publishedEvents=${publishedEvents} registrations=${registrations}`);

    if (contacts < 1) {
      console.log("FAIL A4: contacts must be >= 1 (import or portal lead)");
      failed = true;
    }
    if (publishedEvents < 1) {
      console.log("WARN B1: no published event — operator must publish before Part B");
    }

    const portalChecks = [
      [`${baseUrl}/portal/${pilot.slug}`, "portal home"],
      [`${baseUrl}/portal/${pilot.slug}/events`, "portal events"],
      [`${baseUrl}/portal/${pilot.slug}/join`, "membership join"],
    ] as const;

    for (const [url, label] of portalChecks) {
      const ok = await checkHttp(url, `${pilot.slug} ${label}`);
      if (!ok) failed = true;
    }
    console.log("");
  }

  const dashboardOk = await checkHttp(`${baseUrl}/dashboard`, "dashboard (redirect/auth expected)");
  if (!dashboardOk) {
    console.log("WARN dashboard HTTP check — may redirect to sign-in (expected without session)");
  }

  if (failed) {
    throw new Error("Pilot sign-off verification failed — complete Part A/B in docs/01-PILOT-RUNBOOK.md");
  }

  console.log("Pilot sign-off (automated): PASS");
  console.log("Manual: sign in as operator and complete Part A/B checkboxes in docs/01-PILOT-RUNBOOK.md");
  console.log("Then record sign-off in docs/04-PRODUCTION.md");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
