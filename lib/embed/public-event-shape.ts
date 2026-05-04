import type { Event } from '@prisma/client'
import { resolveEventDetailsUrl } from '@/lib/embed/events-utils'

const PUBLIC_APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.JANAGANA_BASE_URL ||
  'http://localhost:3000'

type PublicEventShape = {
  id: string
  title: string
  shortSummary: string | null
  description: string | null
  startDate: Date
  endDate: Date | null
  location: string | null
  coverImageUrl: string | null
  speakerName: string | null
  attendeeCount: number | null
  tags: string[]
  format: Event['format']
  priceCents: number
  status: Event['status']
  virtualLink: string | null
  isVirtual: boolean
  detailsUrl: string
  registrationUrl: string | null
  portalUrl: string
}

function shouldExposeRegistration(event: Event): boolean {
  if (event.status !== 'PUBLISHED') return false
  return event.startDate >= new Date()
}

export function toPublicEventShape(event: Event, tenantSlug: string): PublicEventShape {
  const fallbackPortalPath = `/portal/${tenantSlug}/events`
  const fallbackPortalUrl = `${PUBLIC_APP_ORIGIN}${fallbackPortalPath}`
  const detailsUrl = resolveEventDetailsUrl(
    { detailsUrl: null, virtualLink: event.virtualLink },
    `${fallbackPortalUrl}#event-${event.id}`,
  )

  return {
    id: event.id,
    title: event.title,
    shortSummary: event.shortSummary,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    coverImageUrl: event.coverImageUrl,
    speakerName: event.speakerName,
    attendeeCount: event.attendeeCount,
    tags: event.tags,
    format: event.format,
    priceCents: event.priceCents,
    status: event.status,
    virtualLink: event.virtualLink,
    isVirtual: event.format !== 'IN_PERSON' || Boolean(event.virtualLink),
    detailsUrl,
    registrationUrl: shouldExposeRegistration(event) ? detailsUrl : null,
    portalUrl: fallbackPortalUrl,
  }
}
