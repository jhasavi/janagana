#!/usr/bin/env tsx
/**
 * Read-only preflight: environment, database target, Clerk orgs, tenant mappings.
 * Does not modify data. Does not run reset/seed/bootstrap.
 */
import { PrismaClient } from "@prisma/client";
import { PILOT_TENANT_SLUGS, PILOT_TENANTS } from "@/lib/pilot/tenants";
import {
  classifyDatabase,
  isProductionLike,
  keyModeFromPrefix,
  loadPilotEnvFiles,
  maskDatabaseUrl,
  maskId,
  maskSecret,
  parseArgsList,
  parseDatabaseUrl,
  resolveDatabaseUrl,
} from "./lib/pilot-script-utils";

const HIGHLIGHT_ORG_NAMES = [
  "namaste boston",
  "the purple wings",
  "purple wings",
  "icon",
  "julia's organization",
  "julia",
  "vidya",
] as const;

type ClerkOrgRow = {
  id: string;
  name: string;
  slug: string | null;
  membersCount: number | null;
};

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  clerkOrgId: string;
  tenantAdmins: number;
  counts: {
    contacts: number;
    events: number;
    registrations: number;
    memberships: number;
    payments: number;
    receipts: number;
    communications: number;
  };
};

type MappingIssue = {
  severity: "ok" | "info" | "warning" | "error";
  code: string;
  message: string;
};

function resolvePreflightDatabaseUrl(flags: Record<string, string | boolean>) {
  const production = Boolean(flags.production);
  const development = Boolean(flags.development);

  if (production && development) {
    throw new Error("Pass only one of --production or --development");
  }

  if (production) {
    const url = resolveDatabaseUrl("production");
    if (!url) {
      throw new Error(
        "--production requires PRODUCTION_DATABASE_URL in .env.pilot.prod.local (run npm run env:setup after vercel env pull)",
      );
    }
    return { url, source: "PRODUCTION_DATABASE_URL (.env.pilot.prod.local)" as const };
  }

  if (development) {
    const url = resolveDatabaseUrl("development");
    if (!url) {
      throw new Error("--development requires DATABASE_URL in .env.local (run npm run env:setup -- --apply)");
    }
    return { url, source: "DATABASE_URL (.env.local)" as const };
  }

  const url = resolveDatabaseUrl();
  if (!url) throw new Error("Set DATABASE_URL in .env.local or PRODUCTION_DATABASE_URL in .env.pilot.prod.local");
  const source = process.env.PRODUCTION_DATABASE_URL?.trim()
    ? "PRODUCTION_DATABASE_URL (default precedence)"
    : "DATABASE_URL (.env.local)";
  return { url, source };
}

function envFlag(name: string): string {
  const raw = process.env[name]?.trim();
  if (!raw) return "(not set)";
  return raw === "true" ? "true ⚠ enabled" : raw;
}

function normalizeOrgName(name: string) {
  return name.trim().toLowerCase();
}

function isHighlightedOrg(name: string) {
  const n = normalizeOrgName(name);
  return HIGHLIGHT_ORG_NAMES.some((hint) => n.includes(hint) || hint.includes(n));
}

async function fetchClerkOrganizations() {
  const secret = process.env.CLERK_SECRET_KEY?.trim() ?? "";
  if (!secret) {
    return { ok: false as const, error: "CLERK_SECRET_KEY not set", data: [] as ClerkOrgRow[] };
  }

  const response = await fetch("https://api.clerk.com/v1/organizations?limit=100", {
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false as const,
      error: `Clerk API ${response.status}: ${body.slice(0, 80)}`,
      data: [] as ClerkOrgRow[],
    };
  }

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];

  const data: ClerkOrgRow[] = rows.map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    slug: row.slug ? String(row.slug) : null,
    membersCount:
      typeof row.members_count === "number"
        ? row.members_count
        : typeof row.membersCount === "number"
          ? row.membersCount
          : null,
  }));

  return { ok: true as const, error: null, data };
}

async function loadTenants(prisma: PrismaClient, slugFilter: string[] | null): Promise<TenantRow[]> {
  const tenants = await prisma.tenant.findMany({
    where: slugFilter && slugFilter.length > 0 ? { slug: { in: slugFilter } } : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      clerkOrgId: true,
      _count: {
        select: {
          tenantAdmins: true,
          contacts: true,
          events: true,
          registrations: true,
          memberships: true,
          payments: true,
          receipts: true,
          communications: true,
        },
      },
    },
  });

  return tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    clerkOrgId: t.clerkOrgId,
    tenantAdmins: t._count.tenantAdmins,
    counts: {
      contacts: t._count.contacts,
      events: t._count.events,
      registrations: t._count.registrations,
      memberships: t._count.memberships,
      payments: t._count.payments,
      receipts: t._count.receipts,
      communications: t._count.communications,
    },
  }));
}

function compareMappings(tenants: TenantRow[], clerkOrgs: ClerkOrgRow[]) {
  const issues: MappingIssue[] = [];
  const tenantByClerkOrg = new Map(tenants.map((t) => [t.clerkOrgId, t]));
  const clerkById = new Map(clerkOrgs.map((o) => [o.id, o]));

  for (const tenant of tenants) {
    const org = clerkById.get(tenant.clerkOrgId);
    if (!org) {
      if (tenant.status !== "ACTIVE") {
        issues.push({
          severity: "info",
          code: "TENANT_INACTIVE_ORPHAN",
          message: `Inactive tenant "${tenant.name}" (${tenant.slug}, ${tenant.status}) — skipped for pilot mapping checks`,
        });
        continue;
      }
      issues.push({
        severity: "error",
        code: "TENANT_ORPHAN",
        message: `Tenant "${tenant.name}" (${tenant.slug}) references Clerk org ${maskId(tenant.clerkOrgId)} not found in current Clerk environment`,
      });
      continue;
    }

    const expectedPilot = PILOT_TENANTS[tenant.slug as keyof typeof PILOT_TENANTS];
    if (expectedPilot && tenant.slug !== org.slug && org.slug) {
      issues.push({
        severity: "warning",
        code: "CLERK_SLUG_DRIFT",
        message: `Tenant slug ${tenant.slug} maps to Clerk org slug "${org.slug}"`,
      });
    }

    issues.push({
      severity: "ok",
      code: "MAPPED",
      message: `Mapped: ${tenant.name} (${tenant.slug}) ↔ Clerk "${org.name}" (${maskId(org.id)})`,
    });
  }

  for (const org of clerkOrgs) {
    if (!tenantByClerkOrg.has(org.id)) {
      const highlight = isHighlightedOrg(org.name);
      issues.push({
        severity: highlight ? "info" : "info",
        code: "CLERK_UNMAPPED",
        message: `Clerk org "${org.name}" (${maskId(org.id)}) has no JanaGana Tenant row${highlight ? " [highlighted]" : ""}`,
      });
    }
  }

  for (const slug of PILOT_TENANT_SLUGS) {
    const tenant = tenants.find((t) => t.slug === slug);
    const config = PILOT_TENANTS[slug];
    if (!tenant) {
      issues.push({
        severity: "warning",
        code: "PILOT_TENANT_MISSING",
        message: `Approved pilot tenant missing in DB: ${config.name} (${slug})`,
      });
    }
  }

  const tpwEnv = process.env.PILOT_TPW_CLERK_ORG_ID?.trim();
  const nbEnv = process.env.PILOT_NB_CLERK_ORG_ID?.trim();
  const tpwTenant = tenants.find((t) => t.slug === "purple-wings");
  const nbTenant = tenants.find((t) => t.slug === "namaste-boston");

  if (tpwEnv && tpwTenant && tpwTenant.clerkOrgId !== tpwEnv) {
    issues.push({
      severity: "warning",
      code: "ENV_TPW_MISMATCH",
      message: `PILOT_TPW_CLERK_ORG_ID (${maskId(tpwEnv)}) ≠ DB tenant (${maskId(tpwTenant.clerkOrgId)})`,
    });
  }
  if (nbEnv && nbTenant && nbTenant.clerkOrgId !== nbEnv) {
    issues.push({
      severity: "warning",
      code: "ENV_NB_MISMATCH",
      message: `PILOT_NB_CLERK_ORG_ID (${maskId(nbEnv)}) ≠ DB tenant (${maskId(nbTenant.clerkOrgId)})`,
    });
  }

  return issues;
}

function environmentAlignment(dbClass: ReturnType<typeof classifyDatabase>, clerkMode: ReturnType<typeof keyModeFromPrefix>) {
  const issues: MappingIssue[] = [];

  if (clerkMode === "test" && dbClass === "production") {
    issues.push({
      severity: "error",
      code: "ENV_MISMATCH",
      message: "Development Clerk keys (sk_test_) with a production-like database — do not run scripts",
    });
  }
  if (clerkMode === "live" && (dbClass === "local" || dbClass === "dev")) {
    issues.push({
      severity: "error",
      code: "ENV_MISMATCH",
      message: "Production Clerk keys (sk_live_) with a local/dev database — likely wrong target",
    });
  }
  if (clerkMode === "test" && dbClass === "local") {
    issues.push({
      severity: "ok",
      code: "ENV_ALIGNED",
      message: "Development Clerk + local/dev database — typical local setup",
    });
  }
  if (clerkMode === "live" && dbClass === "production") {
    issues.push({
      severity: "ok",
      code: "ENV_ALIGNED",
      message: "Production Clerk + production-like database — typical prod preflight",
    });
  }

  return issues;
}

function recommendedCommands(input: {
  dbSource: string;
  productionLike: boolean;
  tenants: TenantRow[];
  issues: MappingIssue[];
}) {
  const lines: string[] = [];
  const hasErrors = input.issues.some((i) => i.severity === "error");
  const dbVar = input.productionLike ? "PRODUCTION_DATABASE_URL='postgresql://…'" : "DATABASE_URL='postgresql://…'";

  if (hasErrors) {
    lines.push("STOP — fix environment/mapping errors before reset/seed/bootstrap.");
    return lines;
  }

  lines.push("# Read-only dry-runs (safe next steps):");
  for (const slug of PILOT_TENANT_SLUGS) {
    const tenant = input.tenants.find((t) => t.slug === slug);
    if (tenant) {
      const hasData = Object.values(tenant.counts).some((n) => n > 0);
      if (hasData) {
        lines.push(`${dbVar} npm run pilot:reset -- --tenant=${slug} --dry-run`);
      }
    } else {
      lines.push(
        `${dbVar} PILOT_${slug === "purple-wings" ? "TPW" : "NB"}_CLERK_ORG_ID=org_… npm run pilot:seed -- --tenant=${slug} --dry-run`,
      );
    }
  }

  const iconUnmapped = input.issues.some(
    (i) => i.code === "CLERK_UNMAPPED" && i.message.toLowerCase().includes("icon"),
  );
  if (iconUnmapped) {
    lines.push("");
    lines.push("# ICON (later — admin bootstrap only, not pilot reset):");
    lines.push(
      `${dbVar} npm run pilot:bootstrap -- --name="ICON" --slug=icon-needham --clerk-org-id=org_… --dry-run`,
    );
  }

  if (input.productionLike) {
    lines.push("");
    lines.push("WARNING: Production DB detected — never apply reset without reviewing dry-run output.");
  }

  return lines;
}

async function main() {
  const { flags, tenants: tenantArgs } = parseArgsList(process.argv.slice(2));
  const json = Boolean(flags.json);
  const all = Boolean(flags.all);

  const slugFilter = all || tenantArgs.length === 0 ? null : tenantArgs;

  if (Boolean(flags.production)) loadPilotEnvFiles("production");
  else if (Boolean(flags.development)) loadPilotEnvFiles("development");
  else loadPilotEnvFiles("default");

  const db = resolvePreflightDatabaseUrl(flags);
  process.env.DATABASE_URL = db.url;

  const parsedDb = parseDatabaseUrl(db.url);
  const dbClass = classifyDatabase(parsedDb.host, parsedDb.database);
  const productionLike = isProductionLike(parsedDb.host, parsedDb.database);

  const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  const clerkSk = process.env.CLERK_SECRET_KEY?.trim() ?? "";
  const clerkPkMode = keyModeFromPrefix(clerkPk);
  const clerkSkMode = keyModeFromPrefix(clerkSk);

  const envReport = {
    databaseUrl: maskDatabaseUrl(process.env.DATABASE_URL),
    productionDatabaseUrl: maskDatabaseUrl(process.env.PRODUCTION_DATABASE_URL),
    databaseSource: db.source,
    clerkSecretKey: maskSecret(clerkSk),
    clerkPublishableKey: maskSecret(clerkPk),
    clerkPublishableMode: clerkPkMode,
    clerkSecretMode: clerkSkMode,
    pilotTpwClerkOrgId: maskId(process.env.PILOT_TPW_CLERK_ORG_ID),
    pilotNbClerkOrgId: maskId(process.env.PILOT_NB_CLERK_ORG_ID),
    enableSelfServeOnboarding: envFlag("ENABLE_SELF_SERVE_ONBOARDING"),
    enableExistingOrgSetup: envFlag("ENABLE_EXISTING_ORG_SETUP"),
    stripeSecretKey: maskSecret(process.env.STRIPE_SECRET_KEY),
    stripeWebhookSecret: maskSecret(process.env.STRIPE_WEBHOOK_SECRET),
    vercelEnv: process.env.VERCEL_ENV ?? "(not set)",
    nodeEnv: process.env.NODE_ENV ?? "(not set)",
  };

  const prisma = new PrismaClient();
  let dbReachable = false;
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbReachable = true;
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error);
  }

  const tenants = dbReachable ? await loadTenants(prisma, slugFilter) : [];
  const clerk = await fetchClerkOrganizations();

  const mappingIssues = compareMappings(tenants, clerk.ok ? clerk.data : []);
  const envIssues = environmentAlignment(dbClass, clerkSkMode !== "unknown" ? clerkSkMode : clerkPkMode);
  const allIssues = [...envIssues, ...mappingIssues];

  if (clerkPkMode !== "unknown" && clerkSkMode !== "unknown" && clerkPkMode !== clerkSkMode) {
    allIssues.push({
      severity: "error",
      code: "CLERK_KEY_MISMATCH",
      message: `Clerk publishable (${clerkPkMode}) and secret (${clerkSkMode}) key modes differ`,
    });
  }

  const highlightedClerk = clerk.ok
    ? clerk.data.filter((o) => isHighlightedOrg(o.name))
    : [];

  const report = {
    generatedAt: new Date().toISOString(),
    mode: {
      production: Boolean(flags.production),
      development: Boolean(flags.development),
      tenantFilter: slugFilter,
    },
    environment: envReport,
    database: {
      host: parsedDb.host,
      name: parsedDb.database,
      classification: dbClass,
      productionLike,
      reachable: dbReachable,
      error: dbError,
    },
    tenants,
    clerk: clerk.ok
      ? {
          count: clerk.data.length,
          mode: clerkSkMode !== "unknown" ? clerkSkMode : clerkPkMode,
          organizations: clerk.data.map((o) => ({
            name: o.name,
            slug: o.slug,
            idMasked: maskId(o.id),
            membersCount: o.membersCount,
            mappedTenantSlug: tenants.find((t) => t.clerkOrgId === o.id)?.slug ?? null,
            highlighted: isHighlightedOrg(o.name),
          })),
        }
      : { error: clerk.error },
    highlightedClerkOrgs: highlightedClerk.map((o) => ({
      name: o.name,
      slug: o.slug,
      idMasked: maskId(o.id),
      mapped: tenants.some((t) => t.clerkOrgId === o.id),
    })),
    issues: allIssues,
    recommendations: recommendedCommands({
      dbSource: db.source,
      productionLike,
      tenants,
      issues: allIssues,
    }),
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    await prisma.$disconnect();
    if (!dbReachable || allIssues.some((i) => i.severity === "error")) {
      process.exitCode = 1;
    }
    return;
  }

  console.log("JanaGana pilot preflight (read-only)");
  console.log("===================================");
  console.log("");

  console.log("Environment variables (masked)");
  console.log(`  DATABASE_URL:              ${envReport.databaseUrl}`);
  console.log(`  PRODUCTION_DATABASE_URL:   ${envReport.productionDatabaseUrl}`);
  console.log(`  Active DB source:          ${db.source}`);
  console.log(`  CLERK_SECRET_KEY:          ${envReport.clerkSecretKey} (mode=${clerkSkMode})`);
  console.log(`  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${envReport.clerkPublishableKey} (mode=${clerkPkMode})`);
  console.log(`  PILOT_TPW_CLERK_ORG_ID:    ${envReport.pilotTpwClerkOrgId}`);
  console.log(`  PILOT_NB_CLERK_ORG_ID:     ${envReport.pilotNbClerkOrgId}`);
  console.log(`  ENABLE_SELF_SERVE_ONBOARDING: ${envReport.enableSelfServeOnboarding}`);
  console.log(`  ENABLE_EXISTING_ORG_SETUP:    ${envReport.enableExistingOrgSetup}`);
  console.log(`  STRIPE_SECRET_KEY:         ${envReport.stripeSecretKey}`);
  console.log(`  STRIPE_WEBHOOK_SECRET:     ${envReport.stripeWebhookSecret}`);
  console.log(`  VERCEL_ENV / NODE_ENV:       ${envReport.vercelEnv} / ${envReport.nodeEnv}`);
  console.log("");

  console.log("Database target");
  console.log(`  host:           ${parsedDb.host}`);
  console.log(`  database:       ${parsedDb.database}`);
  console.log(`  classification: ${dbClass}${productionLike ? " ⚠ production-like" : ""}`);
  console.log(`  reachable:      ${dbReachable ? "yes" : `no — ${dbError}`}`);
  console.log("");

  if (tenants.length > 0) {
    console.log("JanaGana tenants");
    for (const t of tenants) {
      console.log(`  • ${t.name} (${t.slug}) [${t.status}]`);
      console.log(`    tenantId:     ${maskId(t.id)}`);
      console.log(`    clerkOrgId:   ${maskId(t.clerkOrgId)}`);
      console.log(`    tenantAdmins: ${t.tenantAdmins}`);
      console.log(
        `    data: contacts=${t.counts.contacts} events=${t.counts.events} registrations=${t.counts.registrations} memberships=${t.counts.memberships} payments=${t.counts.payments} receipts=${t.counts.receipts} comms=${t.counts.communications}`,
      );
    }
    console.log("");
  } else if (dbReachable) {
    console.log("JanaGana tenants: (none matching filter)");
    console.log("");
  }

  if (clerk.ok) {
    console.log(`Clerk organizations (${clerkSkMode !== "unknown" ? clerkSkMode : clerkPkMode} instance)`);
    for (const o of clerk.data.sort((a, b) => a.name.localeCompare(b.name))) {
      const mapped = tenants.find((t) => t.clerkOrgId === o.id);
      const mark = isHighlightedOrg(o.name) ? " ★" : "";
      console.log(
        `  • ${o.name}${mark} slug=${o.slug ?? "(none)"} id=${maskId(o.id)} members=${o.membersCount ?? "n/a"} mapped=${mapped ? mapped.slug : "—"}`,
      );
    }
    console.log("");
  } else {
    console.log(`Clerk organizations: unavailable (${clerk.error})`);
    console.log("");
  }

  if (highlightedClerk.length > 0) {
    console.log("Highlighted orgs (your checklist)");
    for (const o of highlightedClerk) {
      const mapped = tenants.some((t) => t.clerkOrgId === o.id);
      let note = mapped ? "mapped in JanaGana" : "not mapped — expected for ICON/Julia until bootstrap";
      if (normalizeOrgName(o.name).includes("vidya") && clerkSkMode === "test") {
        note = "dev Clerk only — should not map to production DB";
      }
      console.log(`  • ${o.name}: ${note}`);
    }
    console.log("");
  }

  console.log("Mapping & environment checks");
  for (const issue of allIssues) {
    const prefix =
      issue.severity === "error" ? "ERROR" : issue.severity === "warning" ? "WARN " : issue.severity === "ok" ? "OK   " : "INFO ";
    console.log(`  ${prefix} ${issue.message}`);
  }
  console.log("");

  console.log("Recommended next commands (not executed)");
  for (const line of report.recommendations) {
    console.log(line);
  }
  console.log("");

  const safeToReset =
    dbReachable &&
    !allIssues.some((i) => i.severity === "error") &&
    tenants.some((t) => PILOT_TENANT_SLUGS.includes(t.slug as (typeof PILOT_TENANT_SLUGS)[number]));

  console.log("Summary");
  console.log(`  Safe to run pilot:reset dry-run?  ${safeToReset ? "yes (after you confirm DB + Clerk above)" : "no — fix errors first"}`);
  console.log(`  ICON should stay unmapped?      yes until admin pilot:bootstrap`);
  console.log(`  Self-serve onboarding enabled?    ${process.env.ENABLE_SELF_SERVE_ONBOARDING === "true" ? "YES ⚠" : "no (good)"}`);

  await prisma.$disconnect();

  if (!dbReachable || allIssues.some((i) => i.severity === "error")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
