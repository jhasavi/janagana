/**
 * JanaGana Event Integration Client
 * 
 * This is a reusable client that customers can use to integrate JanaGana events
 * into their websites with minimal configuration.
 */

import type { EventDisplayConfig, EventTheme } from './event-integration-config'

export interface JanaGanaEvent {
  id: string
  title: string
  shortSummary: string | null
  description: string | null
  startDate: string
  endDate: string | null
  location: string | null
  coverImageUrl: string | null
  speakerName: string | null
  attendeeCount: number | null
  tags: string[]
  format: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  priceCents: number
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'COMPLETED'
  virtualLink: string | null
  isVirtual: boolean
  detailsUrl: string
  registrationUrl: string | null
  portalUrl: string
}

export interface JanaGanaEventsResponse {
  success: boolean
  data: JanaGanaEvent[]
}

export class JanaGanaEventClient {
  private baseUrl: string
  private config: EventDisplayConfig

  constructor(config: EventDisplayConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://janagana.namasteneedham.com'
  }

  /**
   * Fetch upcoming events
   */
  async fetchUpcomingEvents(): Promise<JanaGanaEvent[]> {
    const url = `${this.baseUrl}/api/embed/events`
    const params = new URLSearchParams({
      tenantSlug: this.config.tenantSlug,
      maxItems: String(this.config.maxItems || 12),
    })

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch upcoming events: ${response.statusText}`)
    }

    const result: JanaGanaEventsResponse = await response.json()
    return result.data || []
  }

  /**
   * Fetch past events
   */
  async fetchPastEvents(): Promise<JanaGanaEvent[]> {
    if (this.config.upcomingOnly) return []

    const url = `${this.baseUrl}/api/embed/past-events`
    const params = new URLSearchParams({
      tenantSlug: this.config.tenantSlug,
      maxItems: String(this.config.pastEventsMaxItems || 24),
    })

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 600 }, // Cache for 10 minutes
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch past events: ${response.statusText}`)
    }

    const result: JanaGanaEventsResponse = await response.json()
    return result.data || []
  }

  /**
   * Fetch all events (upcoming + past)
   */
  async fetchAllEvents(): Promise<{ upcoming: JanaGanaEvent[]; past: JanaGanaEvent[] }> {
    const [upcoming, past] = await Promise.all([
      this.fetchUpcomingEvents(),
      this.fetchPastEvents(),
    ])

    return { upcoming, past }
  }

  /**
   * Get featured event (first upcoming event)
   */
  async getFeaturedEvent(): Promise<JanaGanaEvent | null> {
    if (!this.config.featuredEvent) return null

    const upcoming = await this.fetchUpcomingEvents()
    return upcoming.length > 0 ? upcoming[0] : null
  }

  /**
   * Generate CSS variables for theme customization
   */
  generateThemeCSS(): string {
    const theme = this.config.theme
    const customColors = this.config.customColors || {}

    const colors = {
      primary: customColors.primary || theme?.primaryColor || '#7c3aed',
      secondary: customColors.secondary || theme?.secondaryColor || '#6d28d9',
      accent: customColors.accent || theme?.accentColor || '#10b981',
      background: customColors.background || theme?.backgroundColor || '#f8fafc',
      text: customColors.text || theme?.textColor || '#1e293b',
      border: customColors.border || theme?.borderColor || '#e2e8f0',
      success: customColors.success || '#10b981',
      warning: customColors.warning || '#f59e0b',
      error: customColors.error || '#ef4444',
    }

    return `
      :root {
        --janagana-primary: ${colors.primary};
        --janagana-secondary: ${colors.secondary};
        --janagana-accent: ${colors.accent};
        --janagana-background: ${colors.background};
        --janagana-text: ${colors.text};
        --janagana-border: ${colors.border};
        --janagana-success: ${colors.success};
        --janagana-warning: ${colors.warning};
        --janagana-error: ${colors.error};
      }
    `
  }

  /**
   * Get grid CSS classes based on configuration
   */
  getGridClasses(): string {
    const cols = this.config.gridColumns || {
      mobile: 1,
      tablet: 2,
      desktop: 3,
      large: 4,
    }

    return `
      grid-cols-${cols.mobile || 1}
      md:grid-cols-${cols.tablet || 2}
      lg:grid-cols-${cols.desktop || 3}
      xl:grid-cols-${cols.large || 4}
    `
  }

  /**
   * Get spacing classes based on configuration
   */
  getSpacingClasses(): string {
    const spacing = this.config.spacing || 'normal'
    
    switch (spacing) {
      case 'tight':
        return 'gap-2 p-4'
      case 'loose':
        return 'gap-8 p-8'
      default:
        return 'gap-6 p-6'
    }
  }

  /**
   * Filter events based on configuration
   */
  filterEvents(events: JanaGanaEvent[]): JanaGanaEvent[] {
    let filtered = [...events]

    // Exclude completed events if configured
    if (this.config.excludeCompleted) {
      filtered = filtered.filter(event => event.status !== 'COMPLETED')
    }

    // Limit to max items
    if (this.config.maxItems) {
      filtered = filtered.slice(0, this.config.maxItems)
    }

    return filtered
  }

  /**
   * Get event display data with all necessary information
   */
  getEventDisplayData(event: JanaGanaEvent) {
    const isFree = event.priceCents <= 0
    const isPast = event.status === 'COMPLETED' || new Date(event.startDate) < new Date()
    const hasImage = this.config.showImages && event.coverImageUrl

    return {
      ...event,
      isFree,
      isPast,
      hasImage,
      showSpeaker: this.config.showSpeaker && !!event.speakerName,
      showAttendance: this.config.showAttendance && !!event.attendeeCount && isPast,
      showDescription: this.config.showDescription && !!(event.shortSummary || event.description),
      showTags: this.config.showTags && event.tags.length > 0,
      showCalendarLinks: this.config.showCalendarLinks,
      showRegisterButton: this.config.showRegisterButton && !isPast && !!event.registrationUrl,
      showDetailsButton: this.config.showDetailsButton && !!event.detailsUrl,
      openInNewTab: this.config.openInNewTab,
      lazyLoadImage: this.config.lazyLoadImages,
      animateOnHover: this.config.animateOnHover,
    }
  }

  /**
   * Generate calendar URL for an event
   */
  generateCalendarUrl(event: JanaGanaEvent): string {
    const start = new Date(event.startDate)
    const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000)

    const toStamp = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${toStamp(start)}/${toStamp(end)}`,
      details: `${event.shortSummary || event.description || ''}\n\n${event.detailsUrl || event.portalUrl || ''}`,
      location: event.location || (event.isVirtual ? 'Virtual event' : ''),
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  /**
   * Get registration URL for an event
   */
  getRegistrationUrl(event: JanaGanaEvent): string | null {
    if (event.status !== 'PUBLISHED') return null
    if (new Date(event.startDate) < new Date()) return null
    
    return event.registrationUrl || event.detailsUrl || event.portalUrl
  }

  /**
   * Get details URL for an event
   */
  getDetailsUrl(event: JanaGanaEvent): string {
    return event.detailsUrl || event.portalUrl
  }
}

/**
 * Factory function to create a pre-configured client
 */
export function createJanaGanaEventClient(config: EventDisplayConfig): JanaGanaEventClient {
  return new JanaGanaEventClient(config)
}

/**
 * Quick setup function for common configurations
 */
export function quickSetup(tenantSlug: string, options: Partial<EventDisplayConfig> = {}): JanaGanaEventClient {
  const config = {
    tenantSlug,
    ...options,
  } as EventDisplayConfig

  return createJanaGanaEventClient(config)
}
