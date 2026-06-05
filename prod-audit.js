const { PrismaClient } = require('@prisma/client');

async function clerkOrgCheck(clerkOrgId) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return { available: false, error: 'missing clerk secret' };
  const res = await fetch(`https://api.clerk.com/v1/organizations/${encodeURIComponent(clerkOrgId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (res.status === 404) return { exists: false, status: 404 };
  if (!res.ok) {
    const body = await res.text();
    return { exists: null, status: res.status, error: body.slice(0, 200) };
  }
  const json = await res.json();
  return { exists: true, name: json.name ?? null, slug: json.slug ?? null, status: res.status };
}

async function clerkUserMemberships(userId) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return { available: false, error: 'missing clerk secret' };
  const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}/organization_memberships?limit=100`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (res.status === 404) return { membershipList: [], status: 404 };
  if (!res.ok) {
    const body = await res.text();
    return { membershipList: null, status: res.status, error: body.slice(0, 200) };
  }
  const json = await res.json();
  return { membershipList: Array.isArray(json.data) ? json.data : [], status: res.status };
}

(async () => {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const count = await prisma.tenantAdmin.count();
  console.log('tenantAdminTotalCount=', count);

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      metadata: {
        path: ['source'],
        equals: 'setup_existing_clerk_org',
      },
    },
    select: {
      id: true,
      tenantId: true,
      actorUserId: true,
      action: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('setupExistingClerkOrgAuditLogCount=', auditLogs.length);
  console.log(JSON.stringify(auditLogs, null, 2));

  const suspectTenantIds = [...new Set(auditLogs.map((log) => log.tenantId))];
  const tenantRows = await prisma.tenant.findMany({
    where: { id: { in: suspectTenantIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      clerkOrgId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log('suspectTenantCount=', tenantRows.length);
  console.log(JSON.stringify(tenantRows, null, 2));

  const tenantAdminRows = await prisma.tenantAdmin.findMany({
    where: { tenantId: { in: suspectTenantIds } },
    select: { id: true, tenantId: true, clerkUserId: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log('suspectTenantAdminCount=', tenantAdminRows.length);
  console.log(JSON.stringify(tenantAdminRows, null, 2));

  const rowEvidence = [];
  for (const tenant of tenantRows) {
    const orgCheck = await clerkOrgCheck(tenant.clerkOrgId);
    const tenantAdminsForTenant = tenantAdminRows.filter((ta) => ta.tenantId === tenant.id);
    const userChecks = [];
    for (const ta of tenantAdminsForTenant) {
      const membershipResult = await clerkUserMemberships(ta.clerkUserId);
      userChecks.push({ clerkUserId: ta.clerkUserId, membershipResult });
    }
    rowEvidence.push({ tenant, orgCheck, tenantAdmins: tenantAdminsForTenant, userChecks });
  }

  console.log(JSON.stringify(rowEvidence, null, 2));

  await prisma.$disconnect();
})().catch((error) => {
  console.error('ERROR', error);
  process.exit(1);
});
