export type EmbedEventInput = {
  title: string
  startDate: string | Date
  endDate?: string | Date | null
  location?: string | null
  description?: string | null
  detailsUrl?: string | null
  virtualLink?: string | null
}

const DEFAULT_EVENT_DURATION_MINUTES = 60

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getEventEndDate(
  startDate: string | Date,
  endDate?: string | Date | null,
  defaultDurationMinutes = DEFAULT_EVENT_DURATION_MINUTES,
): Date {
  const start = toDate(startDate)
  if (!start) throw new Error('Invalid event startDate')

  const parsedEndDate = toDate(endDate)
  if (parsedEndDate && parsedEndDate > start) {
    return parsedEndDate
  }

  return new Date(start.getTime() + defaultDurationMinutes * 60 * 1000)
}

export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function resolveEventDetailsUrl(
  event: Pick<EmbedEventInput, 'detailsUrl' | 'virtualLink'>,
  fallbackPortalUrl: string,
): string {
  if (isSafeHttpUrl(event.detailsUrl ?? null)) {
    return event.detailsUrl as string
  }

  if (isSafeHttpUrl(event.virtualLink ?? null)) {
    return event.virtualLink as string
  }

  return fallbackPortalUrl
}

function toCalendarUtcTimestamp(date: Date): string {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const min = String(date.getUTCMinutes()).padStart(2, '0')
  const ss = String(date.getUTCSeconds()).padStart(2, '0')
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`
}

export function buildGoogleCalendarUrl(
  event: EmbedEventInput,
  fallbackDetailsUrl?: string,
): string {
  const start = toDate(event.startDate)
  if (!start) throw new Error('Invalid event startDate')

  const end = getEventEndDate(start, event.endDate)
  const detailsUrl = event.detailsUrl ?? event.virtualLink ?? fallbackDetailsUrl ?? ''
  const details = [event.description ?? '', detailsUrl].filter(Boolean).join('\n\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toCalendarUtcTimestamp(start)}/${toCalendarUtcTimestamp(end)}`,
    details,
    location: event.location ?? event.virtualLink ?? '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function buildIcsContent(
  event: EmbedEventInput,
  fallbackDetailsUrl?: string,
): string {
  const start = toDate(event.startDate)
  if (!start) throw new Error('Invalid event startDate')

  const end = getEventEndDate(start, event.endDate)
  const now = new Date()
  const detailsUrl = event.detailsUrl ?? event.virtualLink ?? fallbackDetailsUrl ?? ''
  const description = [event.description ?? '', detailsUrl].filter(Boolean).join('\n\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JanaGana//Events Embed//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(`${event.title}-${start.getTime()}@janagana`)}`,
    `DTSTAMP:${toCalendarUtcTimestamp(now)}`,
    `DTSTART:${toCalendarUtcTimestamp(start)}`,
    `DTEND:${toCalendarUtcTimestamp(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(event.location ?? event.virtualLink ?? '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

export function buildIcsFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'event'}.ics`
}