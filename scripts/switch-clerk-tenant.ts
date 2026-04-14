import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const clerkUserId = process.env.CLERK_USER_ID
  const tenantSlug = process.env.TENANT_SLUG

  if (!clerkUserId || !tenantSlug) {
    throw new Error('Usage: CLERK_USER_ID=<your_clerk_user_id> TENANT_SLUG=<tenant_slug> pnpm tsx scripts/switch-clerk-tenant.ts')
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) {
    throw new Error(`Tenant not found for slug: ${tenantSlug}`)
  }

  // Enforce unique clerkId by clearing any existing mapping first.
  await prisma.user.updateMany({
    where: { clerkId: clerkUserId },
    data: { clerkId: null },
  })

  const ownerEmail = `owner+${tenantSlug}@example.com`

  const owner = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: ownerEmail,
      },
    },
    update: {
      clerkId: clerkUserId,
      fullName: `${tenant.name} Owner`,
      role: 'OWNER',
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      clerkId: clerkUserId,
      email: ownerEmail,
      fullName: `${tenant.name} Owner`,
      role: 'OWNER',
      isActive: true,
    },
  })

  console.log('Tenant switched successfully.')
  console.log(`clerkUserId: ${clerkUserId}`)
  console.log(`tenant: ${tenant.name} (${tenant.slug})`)
  console.log(`mapped user email: ${owner.email}`)
}

main()
  .catch((error) => {
    console.error('Switch failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
