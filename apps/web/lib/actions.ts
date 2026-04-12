'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { redirect } from 'next/navigation'

export async function createTenant(data: {
  name: string
  slug: string
}) {
  const user = await currentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      users: {
        create: {
          email: user.emailAddresses[0].emailAddress,
          fullName: user.fullName || user.firstName + ' ' + user.lastName,
          avatarUrl: user.imageUrl,
          role: 'OWNER',
        },
      },
      subscription: {
        create: {
          planId: 'starter', // Will need to match actual plan ID
          status: 'TRIALING',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          trialEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  })

  return tenant
}

export async function getUserTenant() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findFirst({
    where: {
      // Clerk user ID would be stored, for now using email as fallback
      email: (await currentUser())?.emailAddresses[0]?.emailAddress,
    },
    include: {
      tenant: true,
    },
  })

  return user?.tenant || null
}

// Member CRUD actions
export async function getMembers() {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.member.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createMember(data: {
  firstName: string
  lastName: string
  email: string
  phone?: string
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.member.create({
    data: {
      tenantId: tenant.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      status: 'ACTIVE',
    },
  })
}

export async function updateMember(id: string, data: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'BANNED'
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.member.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data,
  })
}

export async function deleteMember(id: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.member.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  })
}
