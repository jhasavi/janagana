import { prisma } from './prisma'

/**
 * Sync a Member to a Contact record in the CRM
 * This creates or updates a Contact when a Member is created/updated
 */
export async function syncMemberToContact(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { tenant: true },
  })

  if (!member) {
    throw new Error('Member not found')
  }

  // Check if contact already exists for this member
  const existingContact = await prisma.contact.findUnique({
    where: { memberId },
  })

  if (existingContact) {
    // Update existing contact
    return await prisma.contact.update({
      where: { id: existingContact.id },
      data: {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        avatarUrl: member.avatarUrl,
      },
    })
  } else {
    // Create new contact
    return await prisma.contact.create({
      data: {
        tenantId: member.tenantId,
        memberId: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        avatarUrl: member.avatarUrl,
        source: 'membership',
      },
    })
  }
}

/**
 * Sync an Event to an Activity record in the CRM
 * This creates an Activity when a member registers for an event
 */
export async function syncEventRegistrationToActivity(
  eventRegistrationId: string
) {
  const registration = await prisma.eventRegistration.findUnique({
    where: { id: eventRegistrationId },
    include: {
      event: true,
      member: {
        include: { contact: true },
      },
    },
  })

  if (!registration) {
    throw new Error('Event registration not found')
  }

  // Only create activity if member has a contact
  if (!registration.member.contact) {
    // Auto-sync member to contact first
    await syncMemberToContact(registration.member.id)
  }

  const contact = await prisma.contact.findUnique({
    where: { memberId: registration.member.id },
  })

  if (!contact) {
    console.error('[crm-sync] Failed to find contact after sync for member:', registration.member.id)
    throw new Error('Contact not found after member sync')
  }

  // Create activity for event registration
  try {
    return await prisma.activity.create({
      data: {
        tenantId: registration.event.tenantId,
        contactId: contact.id,
        type: 'MEETING',
        title: `Registered for: ${registration.event.title}`,
        description: `Event on ${registration.event.startDate.toDateString()}`,
        completed: true,
        completedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('[crm-sync] Failed to create activity for event registration:', error)
    throw error
  }
}

/**
 * Sync a Donation to an Activity record in the CRM
 * This creates an Activity when a donation is made
 */
export async function syncDonationToActivity(donationId: string) {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: {
      member: {
        include: { contact: true },
      },
      campaign: true,
    },
  })

  if (!donation) {
    throw new Error('Donation not found')
  }

  // Only create activity if member has a contact
  if (donation.member && !donation.member.contact) {
    await syncMemberToContact(donation.member.id)
  }

  const contact = donation.member
    ? await prisma.contact.findUnique({
        where: { memberId: donation.member.id },
      })
    : null

  if (!contact) {
    // Create contact from donor info if no member
    try {
      const nameParts = donation.donorName ? donation.donorName.trim().split(/\s+/) : ['', '']
      const firstName = nameParts[0] || ''
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
      
      return await prisma.contact.create({
        data: {
          tenantId: donation.tenantId,
          firstName,
          lastName,
          email: donation.donorEmail,
          source: 'donation',
        },
      })
    } catch (error) {
      console.error('[crm-sync] Failed to create contact from donor info:', error)
      throw error
    }
  }

  // Create activity for donation
  try {
    return await prisma.activity.create({
      data: {
        tenantId: donation.tenantId,
        contactId: contact.id,
        type: 'OTHER',
        title: `Donation: $${(donation.amountCents / 100).toFixed(2)}`,
        description: donation.campaign
          ? `Donation to campaign: ${donation.campaign.title}`
          : 'General donation',
        completed: true,
        completedAt: donation.createdAt,
      },
    })
  } catch (error) {
    console.error('[crm-sync] Failed to create activity for donation:', error)
    throw error
  }
}

/**
 * Create a Deal from a lead source (e.g., website form, event)
 */
export async function createDealFromLead(params: {
  tenantId: string
  contactId: string
  title: string
  valueCents?: number
  source?: string
  sourceId?: string
}) {
  return await prisma.deal.create({
    data: {
      tenantId: params.tenantId,
      contactId: params.contactId,
      title: params.title,
      valueCents: params.valueCents || 0,
      stage: 'LEAD',
      probability: 10,
      source: params.source,
      sourceId: params.sourceId,
    },
    include: {
      contact: true,
    },
  })
}
