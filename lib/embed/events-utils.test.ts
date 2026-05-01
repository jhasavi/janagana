import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  getEventEndDate,
  resolveEventDetailsUrl,
} from '@/lib/embed/events-utils'

test('resolveEventDetailsUrl prefers explicit detailsUrl', () => {
  const url = resolveEventDetailsUrl(
    {
      detailsUrl: 'https://example.org/events/spring-festival',
      virtualLink: 'https://meet.example.org/room',
    },
    '/portal/purple-wings/events',
  )

  assert.equal(url, 'https://example.org/events/spring-festival')
})

test('resolveEventDetailsUrl falls back to virtualLink then portal URL', () => {
  const virtualUrl = resolveEventDetailsUrl(
    {
      detailsUrl: null,
      virtualLink: 'https://meet.example.org/room',
    },
    '/portal/purple-wings/events',
  )
  const fallbackUrl = resolveEventDetailsUrl(
    {
      detailsUrl: null,
      virtualLink: null,
    },
    '/portal/purple-wings/events',
  )

  assert.equal(virtualUrl, 'https://meet.example.org/room')
  assert.equal(fallbackUrl, '/portal/purple-wings/events')
})

test('getEventEndDate defaults to 60 minutes when end date is missing', () => {
  const start = new Date('2026-05-01T10:00:00.000Z')
  const end = getEventEndDate(start)
  assert.equal(end.toISOString(), '2026-05-01T11:00:00.000Z')
})

test('buildGoogleCalendarUrl contains key calendar params', () => {
  const url = buildGoogleCalendarUrl(
    {
      title: 'Annual Gala',
      startDate: '2026-06-15T17:00:00.000Z',
      endDate: null,
      location: 'Town Hall',
      description: 'Join us for an evening of celebration',
    },
    'https://example.org/events/annual-gala',
  )

  const parsed = new URL(url)
  assert.equal(parsed.origin, 'https://calendar.google.com')
  assert.equal(parsed.pathname, '/calendar/render')
  assert.equal(parsed.searchParams.get('action'), 'TEMPLATE')
  assert.equal(parsed.searchParams.get('text'), 'Annual Gala')
  assert.match(parsed.searchParams.get('details') ?? '', /annual-gala/)
})

test('buildIcsContent includes DTSTART and DTEND and summary', () => {
  const content = buildIcsContent(
    {
      title: 'Community Meetup',
      startDate: '2026-06-10T15:30:00.000Z',
      location: 'Virtual event',
      description: 'Monthly chapter meetup',
    },
    'https://example.org/events/community-meetup',
  )

  assert.match(content, /BEGIN:VCALENDAR/)
  assert.match(content, /BEGIN:VEVENT/)
  assert.match(content, /SUMMARY:Community Meetup/)
  assert.match(content, /DTSTART:20260610T153000Z/)
  assert.match(content, /DTEND:20260610T163000Z/)
})