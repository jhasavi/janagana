import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const clerkUserId = process.env.CLERK_USER_ID

  if (clerkUserId) {
    const users = await prisma.user.findMany({
      where: { clerkId: clerkUserId },
      include: { tenant: true },
    })

    if (users.length === 0) {
      console.log(`No user found for CLERK_USER_ID=${clerkUserId}`)
      return
    }

    console.log(`Found ${users.length} user mapping(s) for CLERK_USER_ID=${clerkUserId}:`)
    for (const user of users) {
      console.log(`- email: ${user.email}`)
      console.log(`  tenantId: ${user.tenantId}`)
      console.log(`  tenant slug: ${user.tenant?.slug ?? 'unknown'}`)
      console.log(`  tenant name: ${user.tenant?.name ?? 'unknown'}`)
      console.log(`  role: ${user.role}`)
      console.log(`  active: ${user.isActive}`)
      console.log('')
    }
    return
  }

  const users = await prisma.user.findMany({
    where: { clerkId: { not: null } },
    include: { tenant: true },
    orderBy: [{ tenantId: 'asc' }, { email: 'asc' }],
  })

  if (users.length === 0) {
    console.log('No Clerk user mappings found in the database.')
    return
  }

  console.log('Clerk user mappings to tenants:')
  for (const user of users) {
    console.log(`- clerkId: ${user.clerkId}`)
    console.log(`  email: ${user.email}`)
    console.log(`  tenant: ${user.tenant?.name ?? 'unknown'} (${user.tenant?.slug ?? 'unknown'})`)
    console.log(`  role: ${user.role}`)
    console.log(`  active: ${user.isActive}`)
    console.log('')
  }
}

main()
  .catch((error) => {
    console.error('Verification failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
