import { prisma } from '@/lib/prisma'

interface MemberLike {
  id: string
  tenantId: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string
}

/**
 * Backward-compatible contact-first bridge:
 * keep legacy member writes intact while ensuring a canonical Contact exists.
 */
export async function ensureContactForMember(member: MemberLike) {
  const email = member.email.trim().toLowerCase()

  const byMemberId = await prisma.contact.findFirst({
    where: { tenantId: member.tenantId, memberId: member.id },
  })
  if (byMemberId) return byMemberId

  const byEmail = await prisma.contact.findFirst({
    where: {
      tenantId: member.tenantId,
      OR: [{ email }, { emails: { has: email } }],
    },
  })

  if (byEmail) {
    return prisma.contact.update({
      where: { id: byEmail.id },
      data: {
        memberId: byEmail.memberId ?? member.id,
        email: byEmail.email ?? email,
        emails: Array.from(new Set([...(byEmail.emails ?? []), email].filter(Boolean))),
        phones: Array.from(
          new Set([...(byEmail.phones ?? []), member.phone ?? undefined].filter(Boolean))
        ) as string[],
      },
    })
  }

  return prisma.contact.create({
    data: {
      tenantId: member.tenantId,
      memberId: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      email,
      emails: [email],
      phones: member.phone ? [member.phone] : [],
      address: member.address,
      city: member.city,
      state: member.state,
      postalCode: member.postalCode,
      country: member.country,
      source: 'member',
    },
  })
}