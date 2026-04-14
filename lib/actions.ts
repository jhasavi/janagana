'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { redirect } from 'next/navigation'
import { randomBytes, createHash } from 'crypto'

export async function createTenant(data: {
  name: string
  slug: string
}) {
  const user = await currentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const starterPlan = await prisma.plan.findFirst({ where: { slug: 'STARTER' } })
  if (!starterPlan) {
    throw new Error('Starter plan not found. Run database seed first.')
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      users: {
        create: {
          clerkId: user.id,
          email: user.emailAddresses[0].emailAddress,
          fullName: user.fullName || `${user.firstName} ${user.lastName}`,
          avatarUrl: user.imageUrl,
          role: 'OWNER',
        },
      },
      subscription: {
        create: {
          planId: starterPlan.id,
          status: 'TRIALING',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
    where: { clerkId: userId },
    include: { tenant: true },
  })

  return user?.tenant || null
}

export async function getDashboardStats() {
  const tenant = await getUserTenant()
  if (!tenant) return { memberCount: 0, eventCount: 0, volunteerCount: 0, clubCount: 0 }

  const [memberCount, eventCount, volunteerCount, clubCount] = await Promise.all([
    prisma.member.count({ where: { tenantId: tenant.id } }),
    prisma.event.count({ where: { tenantId: tenant.id } }),
    prisma.volunteerOpportunity.count({ where: { tenantId: tenant.id } }),
    prisma.club.count({ where: { tenantId: tenant.id } }),
  ])

  return { memberCount, eventCount, volunteerCount, clubCount }
}

// ─────────────────────────────────────────────
// RBAC helper
// ─────────────────────────────────────────────
async function requireRole(allowedRoles: Array<'OWNER' | 'ADMIN' | 'STAFF' | 'READONLY'>) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const user = await prisma.user.findFirst({ where: { clerkId: userId } })
  if (!user || !allowedRoles.includes(user.role as any)) {
    throw new Error('Forbidden: insufficient permissions')
  }
  return user
}

// ─────────────────────────────────────────────
// Tenant actions
// ─────────────────────────────────────────────

export async function updateTenant(data: {
  name?: string
  slug?: string
  logoUrl?: string
  primaryColor?: string
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.tenant.update({
    where: { id: tenant.id },
    data,
  })
}

// Member CRUD actions
export async function getMembers(page = 1, pageSize = 100) {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.member.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize,
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

  const member = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      status: 'ACTIVE',
    },
  })

  // Send welcome email
  try {
    const { sendWelcomeEmail } = await import('./email')
    await sendWelcomeEmail(data.email, data.firstName, tenant.name)
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    // Don't throw error - email failure shouldn't block member creation
  }

  return member
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
  await requireRole(['OWNER', 'ADMIN'])
  const tenant = await getUserTenant()
  if (!tenant) throw new Error('Tenant not found')

  return await prisma.member.deleteMany({
    where: { id, tenantId: tenant.id },
  })
}

// Event CRUD actions
export async function getEvents(page = 1, pageSize = 100) {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.event.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startsAt: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize,
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
  await requireRole(['OWNER', 'ADMIN'])
  const tenant = await getUserTenant()
  if (!tenant) throw new Error('Tenant not found')

  return await prisma.event.deleteMany({
    where: { id, tenantId: tenant.id },
  })
}

export async function registerForEvent(eventId: string, memberId: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  // Check if already registered
  const existing = await prisma.eventRegistration.findFirst({
    where: {
      eventId,
      memberId,
    },
  })

  if (existing) {
    throw new Error('Already registered for this event')
  }

  const confirmationCode = randomBytes(4).toString('hex').toUpperCase()

  const registration = await prisma.eventRegistration.create({
    data: {
      tenantId: tenant.id,
      eventId,
      memberId,
      confirmationCode,
      status: 'CONFIRMED',
    },
  })

  // Send confirmation email
  try {
    const member = await prisma.member.findUnique({ where: { id: memberId } })
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    
    if (member && event) {
      const { sendEventConfirmationEmail } = await import('./email')
      await sendEventConfirmationEmail(member.email, member.firstName, event.title, event.startsAt)
    }
  } catch (error) {
    console.error('Failed to send event confirmation email:', error)
    // Don't throw error - email failure shouldn't block registration
  }

  return registration
}

export async function getMemberRegistrations(memberId: string) {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.eventRegistration.findMany({
    where: {
      tenantId: tenant.id,
      memberId,
    },
    include: {
      event: true,
    },
    orderBy: { registeredAt: 'desc' },
  })
}

// Club CRUD actions
export async function getClubs(page = 1, pageSize = 100) {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.club.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize,
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
  await requireRole(['OWNER', 'ADMIN'])
  const tenant = await getUserTenant()
  if (!tenant) throw new Error('Tenant not found')

  return await prisma.club.deleteMany({
    where: { id, tenantId: tenant.id },
  })
}

export async function updateClub(id: string, data: {
  name?: string
  slug?: string
  description?: string
  isActive?: boolean
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.club.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data,
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

export async function applyForVolunteerOpportunity(opportunityId: string, memberId: string, coverLetter?: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  // Check if already applied
  const existing = await prisma.volunteerApplication.findFirst({
    where: {
      opportunityId,
      memberId,
    },
  })

  if (existing) {
    throw new Error('Already applied for this opportunity')
  }

  return await prisma.volunteerApplication.create({
    data: {
      tenantId: tenant.id,
      opportunityId,
      memberId,
      status: 'PENDING',
      coverLetter,
    },
  })
}

export async function getVolunteerApplications(memberId: string) {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.volunteerApplication.findMany({
    where: {
      tenantId: tenant.id,
      memberId,
    },
    include: {
      opportunity: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateVolunteerOpportunity(id: string, data: {
  title?: string
  description?: string
  location?: string
  isVirtual?: boolean
  startsAt?: Date
  endsAt?: Date
  isActive?: boolean
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.volunteerOpportunity.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data,
  })
}

// Volunteer Shift CRUD actions
export async function getVolunteerShifts(opportunityId: string) {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.volunteerShift.findMany({
    where: { 
      tenantId: tenant.id,
      opportunityId,
    },
    orderBy: { startsAt: 'asc' },
    include: {
      signups: true,
    },
  })
}

export async function createVolunteerShift(data: {
  opportunityId: string
  name: string
  description?: string
  startsAt: Date
  endsAt: Date
  capacity?: number
  location?: string
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.volunteerShift.create({
    data: {
      tenantId: tenant.id,
      opportunityId: data.opportunityId,
      name: data.name,
      description: data.description,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      capacity: data.capacity || 1,
      location: data.location,
      status: 'OPEN',
    },
  })
}

export async function deleteVolunteerShift(id: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.volunteerShift.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  })
}

export async function signupForShift(shiftId: string, memberId: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  // Check if already signed up
  const existing = await prisma.volunteerShiftSignup.findFirst({
    where: {
      shiftId,
      memberId,
    },
  })

  if (existing) {
    throw new Error('Already signed up for this shift')
  }

  // Check capacity
  const shift = await prisma.volunteerShift.findUnique({
    where: { id: shiftId },
    include: { signups: true },
  })

  if (!shift) {
    throw new Error('Shift not found')
  }

  if (shift.signups.length >= shift.capacity) {
    throw new Error('Shift is full')
  }

  const signup = await prisma.volunteerShiftSignup.create({
    data: {
      tenantId: tenant.id,
      shiftId,
      memberId,
      confirmedAt: new Date(),
    },
  })

  // Send confirmation email
  try {
    const member = await prisma.member.findUnique({ where: { id: memberId } })
    
    if (member) {
      const { sendVolunteerShiftConfirmationEmail } = await import('./email')
      await sendVolunteerShiftConfirmationEmail(member.email, member.firstName, shift.name, shift.startsAt)
    }
  } catch (error) {
    console.error('Failed to send volunteer shift confirmation email:', error)
    // Don't throw error - email failure shouldn't block signup
  }

  return signup
}

export async function cancelShiftSignup(shiftId: string, memberId: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.volunteerShiftSignup.updateMany({
    where: {
      shiftId,
      memberId,
      tenantId: tenant.id,
    },
    data: {
      canceledAt: new Date(),
    },
  })
}

// Volunteer Hours actions
export async function getVolunteerHours(memberId: string) {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.volunteerHours.findMany({
    where: {
      tenantId: tenant.id,
      memberId,
    },
    orderBy: { date: 'desc' },
  })
}

export async function logVolunteerHours(data: {
  memberId: string
  hours: number
  date: Date
  description?: string
  opportunityId?: string
  shiftId?: string
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.volunteerHours.create({
    data: {
      tenantId: tenant.id,
      memberId: data.memberId,
      hours: data.hours,
      date: data.date,
      description: data.description,
      opportunityId: data.opportunityId,
      shiftId: data.shiftId,
      isApproved: false,
    },
  })
}

export async function approveVolunteerHours(id: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.volunteerHours.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data: {
      isApproved: true,
      approvedAt: new Date(),
    },
  })
}

// Subscription management actions
export async function getTenantSubscription() {
  const tenant = await getUserTenant()
  if (!tenant) return null

  return await prisma.tenantSubscription.findFirst({
    where: { tenantId: tenant.id },
  })
}

// Webhook management actions
export async function getWebhooks() {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.webhookSubscription.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createWebhook(data: {
  url: string
  events: string[]
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const secret = randomBytes(32).toString('hex')

  return await prisma.webhookSubscription.create({
    data: {
      tenantId: tenant.id,
      url: data.url,
      events: data.events,
      secret,
      isActive: true,
    },
  })
}

export async function deleteWebhook(id: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.webhookSubscription.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  })
}

export async function toggleWebhook(id: string, isActive: boolean) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.webhookSubscription.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data: { isActive },
  })
}

// API key management actions
export async function getApiKeys() {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.apiKey.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createApiKey(data: {
  name: string
  scope: string
  rateLimit?: number
  expiresAt?: Date
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const rawKey = `jan_${randomBytes(24).toString('hex')}`
  const keyPrefix = rawKey.substring(0, 10)
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const record = await prisma.apiKey.create({
    data: {
      tenantId: tenant.id,
      name: data.name,
      keyHash,
      keyPrefix,
      scope: data.scope as any,
      rateLimit: data.rateLimit || 1000,
      expiresAt: data.expiresAt,
      isActive: true,
    },
  })

  // Return created record plus the plaintext key (only shown once)
  return { ...record, plainTextKey: rawKey }
}

export async function deleteApiKey(id: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.apiKey.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  })
}

export async function toggleApiKey(id: string, isActive: boolean) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.apiKey.updateMany({
    where: {
      id,
      tenantId: tenant.id,
    },
    data: { isActive },
  })
}

// File upload action
export async function uploadFile(file: File, folder?: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const { uploadFile: uploadToCloudinary } = await import('./upload')
  const result = await uploadToCloudinary(file, folder || `tenant-${tenant.id}`)
  
  return result
}

// Membership card action
export async function generateMembershipCardQR(memberId: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      tenantId: tenant.id,
    },
  })

  if (!member) {
    throw new Error('Member not found')
  }

  const organization = await prisma.tenant.findUnique({
    where: { id: tenant.id },
  })

  if (!organization) {
    throw new Error('Organization not found')
  }

  const { generateMembershipCardQR: generateQR } = await import('./membership-card')
  const qrCode = await generateQR(member, organization)
  
  return qrCode
}

// SMS notification actions
export async function sendSMSNotification(memberId: string, message: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      tenantId: tenant.id,
    },
  })

  if (!member) {
    throw new Error('Member not found')
  }

  const { sendSMS } = await import('./sms')
  const result = await sendSMS(member.phone || '', message)
  
  return result
}

export async function sendMembershipRenewalReminder(memberId: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      tenantId: tenant.id,
    },
  })

  if (!member) {
    throw new Error('Member not found')
  }

  const organization = await prisma.tenant.findUnique({
    where: { id: tenant.id },
  })

  if (!organization) {
    throw new Error('Organization not found')
  }

  const { sendMembershipRenewalReminder } = await import('./sms')
  const result = await sendMembershipRenewalReminder(member, organization)
  
  return result
}

// Fundraising/Donations actions
export async function getDonationCampaigns() {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.donationCampaign.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createDonationCampaign(data: {
  title: string
  description: string
  goalAmount: number
  startDate: Date
  endDate?: Date
  isPublic?: boolean
  showProgressBar?: boolean
  showDonorList?: boolean
  allowRecurring?: boolean
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.donationCampaign.create({
    data: {
      tenantId: tenant.id,
      title: data.title,
      description: data.description,
      goalAmountCents: Math.round(data.goalAmount * 100),
      startDate: data.startDate,
      endDate: data.endDate,
      isPublic: data.isPublic ?? true,
      showProgressBar: data.showProgressBar ?? true,
      showDonorList: data.showDonorList ?? false,
      allowRecurring: data.allowRecurring ?? false,
    },
  })
}

export async function getDonations(campaignId?: string) {
  const tenant = await getUserTenant()
  if (!tenant) return []

  const where: { tenantId: string; campaignId?: string } = { tenantId: tenant.id }
  if (campaignId) {
    where.campaignId = campaignId
  }

  return await prisma.donation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      campaign: true,
      member: true,
    },
  })
}

export async function createDonation(data: {
  campaignId?: string
  memberId?: string
  amount: number
  donorName?: string
  donorEmail?: string
  message?: string
  isAnonymous?: boolean
  isRecurring?: boolean
  recurringInterval?: string
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const donation = await prisma.donation.create({
    data: {
      tenantId: tenant.id,
      campaignId: data.campaignId,
      memberId: data.memberId,
      amountCents: Math.round(data.amount * 100),
      donorName: data.donorName,
      donorEmail: data.donorEmail,
      message: data.message,
      isAnonymous: data.isAnonymous ?? false,
      isRecurring: data.isRecurring ?? false,
      recurringInterval: data.recurringInterval as any,
    },
  })

  // Update campaign raised amount if linked to campaign
  if (data.campaignId) {
    await prisma.donationCampaign.update({
      where: { id: data.campaignId },
      data: {
        raisedAmountCents: {
          increment: donation.amountCents,
        },
      },
    })
  }

  return donation
}

export async function cancelSubscription() {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId: tenant.id },
  })

  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new Error('No active subscription found')
  }

  const stripe = getStripe()
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  })

  return await prisma.tenantSubscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
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

// Club Posts and Comments actions
export async function getClubPosts(clubId: string) {
  const tenant = await getUserTenant()
  if (!tenant) return []

  return await prisma.clubPost.findMany({
    where: { 
      tenantId: tenant.id,
      clubId,
    },
    include: {
      author: true,
      comments: {
        include: {
          member: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { isPinned: 'desc', createdAt: 'desc' },
  })
}

export async function createClubPost(data: {
  clubId: string
  authorId: string
  title?: string
  body: string
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.clubPost.create({
    data: {
      tenantId: tenant.id,
      clubId: data.clubId,
      authorId: data.authorId,
      title: data.title,
      body: data.body,
      isPinned: false,
      publishedAt: new Date(),
    },
  })
}

export async function deleteClubPost(id: string) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.clubPost.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  })
}

export async function createClubComment(data: {
  postId: string
  memberId: string
  body: string
}) {
  const tenant = await getUserTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }

  return await prisma.clubPostComment.create({
    data: {
      tenantId: tenant.id,
      postId: data.postId,
      memberId: data.memberId,
      body: data.body,
    },
  })
}
