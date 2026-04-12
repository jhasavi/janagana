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

// Event CRUD actions
export async function getEvents() {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.event.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startsAt: 'desc' },
  })
}

export async function createEvent(data: {
  title: string
  description?: string
  startsAt: Date
  endsAt?: Date
  location?: string
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const slug = data.title.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-' + Date.now()

  return await prisma.event.create({
    data: {
      tenantId: tenant.id,
      title: data.title,
      slug,
      description: data.description,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      location: data.location,
      status: 'DRAFT',
      format: 'IN_PERSON',
    },
  })
}

export async function updateEvent(id: string, data: {
  title?: string
  description?: string
  startsAt?: Date
  endsAt?: Date
  location?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'COMPLETED'
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.event.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data,
  })
}

export async function deleteEvent(id: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.event.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  })
}

// Club CRUD actions
export async function getClubs() {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.club.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createClub(data: {
  name: string
  description?: string
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const slug = data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-' + Date.now()

  return await prisma.club.create({
    data: {
      tenantId: tenant.id,
      name: data.name,
      slug,
      description: data.description,
      isActive: true,
    },
  })
}

export async function deleteClub(id: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.club.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  })
}

// Volunteer Opportunity CRUD actions
export async function getVolunteerOpportunities() {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.volunteerOpportunity.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createVolunteerOpportunity(data: {
  title: string
  description?: string
  location?: string
  isVirtual?: boolean
  startsAt?: Date
  endsAt?: Date
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const slug = data.title.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-' + Date.now()

  return await prisma.volunteerOpportunity.create({
    data: {
      tenantId: tenant.id,
      title: data.title,
      slug,
      description: data.description,
      location: data.location,
      isVirtual: data.isVirtual || false,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isActive: true,
    },
  })
}

export async function deleteVolunteerOpportunity(id: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.volunteerOpportunity.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  })
}

// Stripe integration actions
import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

function getStripe() {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return stripeInstance
}

export async function createCheckoutSession(priceId: string) {
  const stripe = getStripe()
  if (!stripe) {
    throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.')
  }

  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?canceled=true`,
    metadata: {
      tenantId: tenant.id,
    },
  })

  return session
}
