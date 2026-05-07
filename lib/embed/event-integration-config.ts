/**
 * JanaGana Event Integration Configuration
 * 
 * This file defines the configuration interface for website event integrations,
 * enabling customers to customize their event display without code changes.
 */

export interface EventDisplayConfig {
  // Required Configuration
  tenantSlug: string
  baseUrl?: string
  
  // Display Options
  maxItems?: number
  showImages?: boolean
  showSpeaker?: boolean
  showAttendance?: boolean
  showDescription?: boolean
  showCalendarLinks?: boolean
  showRegisterButton?: boolean
  showDetailsButton?: boolean
  showTags?: boolean
  showCategories?: boolean
  
  // Event Filtering
  upcomingOnly?: boolean
  pastEventsMaxItems?: number
  featuredEvent?: boolean
  excludeCompleted?: boolean
  
  // Card Styling
  cardVariant?: 'compact' | 'detailed' | 'featured' | 'minimal'
  cardSize?: 'small' | 'medium' | 'large'
  imageAspectRatio?: 'square' | 'landscape' | 'portrait'
  
  // Theme Customization
  theme?: EventTheme
  customColors?: EventColors
  typography?: EventTypography
  
  // Layout Options
  gridColumns?: {
    mobile?: number
    tablet?: number
    desktop?: number
    large?: number
  }
  spacing?: 'tight' | 'normal' | 'loose'
  
  // Behavior Options
  openInNewTab?: boolean
  lazyLoadImages?: boolean
  animateOnHover?: boolean
  showLoadingState?: boolean
}

export interface EventTheme {
  name: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  borderColor: string
}

export interface EventColors {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  text?: string
  border?: string
  success?: string
  warning?: string
  error?: string
}

export interface EventTypography {
  headingFont?: string
  bodyFont?: string
  headingSizes?: {
    h1?: string
    h2?: string
    h3?: string
    h4?: string
  }
  bodySizes?: {
    small?: string
    medium?: string
    large?: string
  }
}

// Predefined Themes
export const DEFAULT_THEMES: Record<string, EventTheme> = {
  purple: {
    name: 'Violet',
    primaryColor: '#7c3aed',
    secondaryColor: '#6d28d9',
    accentColor: '#10b981',
    backgroundColor: '#f8fafc',
    textColor: '#1e293b',
    borderColor: '#e2e8f0',
  },
  blue: {
    name: 'Professional Blue',
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    accentColor: '#059669',
    backgroundColor: '#f8fafc',
    textColor: '#1e293b',
    borderColor: '#e2e8f0',
  },
  green: {
    name: 'Nature Green',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    accentColor: '#7c3aed',
    backgroundColor: '#f0fdf4',
    textColor: '#14532d',
    borderColor: '#bbf7d0',
  },
  neutral: {
    name: 'Clean Neutral',
    primaryColor: '#374151',
    secondaryColor: '#1f2937',
    accentColor: '#dc2626',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    borderColor: '#e5e7eb',
  },
}

// Default Configuration
export const DEFAULT_CONFIG: Partial<EventDisplayConfig> = {
  maxItems: 12,
  showImages: true,
  showSpeaker: true,
  showAttendance: true,
  showDescription: true,
  showCalendarLinks: true,
  showRegisterButton: true,
  showDetailsButton: true,
  showTags: true,
  showCategories: true,
  upcomingOnly: false,
  pastEventsMaxItems: 24,
  featuredEvent: true,
  excludeCompleted: false,
  cardVariant: 'detailed',
  cardSize: 'medium',
  imageAspectRatio: 'landscape',
  theme: DEFAULT_THEMES.blue,
  gridColumns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    large: 4,
  },
  spacing: 'normal',
  openInNewTab: true,
  lazyLoadImages: true,
  animateOnHover: true,
  showLoadingState: true,
}

// Configuration Validation
export function validateConfig(config: EventDisplayConfig): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!config.tenantSlug) {
    errors.push('tenantSlug is required')
  }

  // Numeric validation
  if (config.maxItems && (config.maxItems < 1 || config.maxItems > 100)) {
    errors.push('maxItems must be between 1 and 100')
  }

  if (config.pastEventsMaxItems && (config.pastEventsMaxItems < 1 || config.pastEventsMaxItems > 200)) {
    errors.push('pastEventsMaxItems must be between 1 and 200')
  }

  // Grid validation
  if (config.gridColumns) {
    const { mobile, tablet, desktop, large } = config.gridColumns
    if (mobile && (mobile < 1 || mobile > 4)) errors.push('mobile grid columns must be 1-4')
    if (tablet && (tablet < 1 || tablet > 6)) errors.push('tablet grid columns must be 1-6')
    if (desktop && (desktop < 1 || desktop > 8)) errors.push('desktop grid columns must be 1-8')
    if (large && (large < 1 || large > 12)) errors.push('large grid columns must be 1-12')
  }

  // Warnings
  if (!config.showImages) {
    warnings.push('Images are hidden - cards may look less engaging')
  }

  if (!config.showRegisterButton && !config.showDetailsButton) {
    warnings.push('No action buttons shown - users may not know how to engage')
  }

  if (config.upcomingOnly && config.featuredEvent) {
    warnings.push('Featured event may not display when upcomingOnly is true')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// Configuration Builder
export class EventConfigBuilder {
  private config: Partial<EventDisplayConfig> = {}

  constructor(tenantSlug: string) {
    this.config.tenantSlug = tenantSlug
  }

  // Display Options
  withImages(show: boolean = true): this {
    this.config.showImages = show
    return this
  }

  withSpeaker(show: boolean = true): this {
    this.config.showSpeaker = show
    return this
  }

  withAttendance(show: boolean = true): this {
    this.config.showAttendance = show
    return this
  }

  withDescription(show: boolean = true): this {
    this.config.showDescription = show
    return this
  }

  withCalendarLinks(show: boolean = true): this {
    this.config.showCalendarLinks = show
    return this
  }

  withRegisterButton(show: boolean = true): this {
    this.config.showRegisterButton = show
    return this
  }

  withDetailsButton(show: boolean = true): this {
    this.config.showDetailsButton = show
    return this
  }

  // Event Filtering
  upcomingOnly(only: boolean = true): this {
    this.config.upcomingOnly = only
    return this
  }

  withMaxItems(max: number): this {
    this.config.maxItems = max
    return this
  }

  withPastEventsMax(max: number): this {
    this.config.pastEventsMaxItems = max
    return this
  }

  withFeaturedEvent(show: boolean = true): this {
    this.config.featuredEvent = show
    return this
  }

  // Styling
  withCardVariant(variant: 'compact' | 'detailed' | 'featured' | 'minimal'): this {
    this.config.cardVariant = variant
    return this
  }

  withCardSize(size: 'small' | 'medium' | 'large'): this {
    this.config.cardSize = size
    return this
  }

  withTheme(theme: EventTheme): this {
    this.config.theme = theme
    return this
  }

  withCustomColors(colors: EventColors): this {
    this.config.customColors = colors
    return this
  }

  withGridColumns(columns: { mobile?: number; tablet?: number; desktop?: number; large?: number }): this {
    this.config.gridColumns = columns
    return this
  }

  // Build
  build(): EventDisplayConfig {
    const finalConfig = { ...DEFAULT_CONFIG, ...this.config } as EventDisplayConfig
    
    const validation = validateConfig(finalConfig)
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`)
    }

    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings)
    }

    return finalConfig
  }
}

// Helper function to create config
export function createEventConfig(tenantSlug: string): EventConfigBuilder {
  return new EventConfigBuilder(tenantSlug)
}
