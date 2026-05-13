import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { getSimplifiedTenantProfile } from '@/lib/tenant-profile-simplified'
import { getPlatformBrandName } from '@/lib/platform-brand'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export function generateMetadata(): Metadata {
  const platformName = getPlatformBrandName()

  try {
    const profile = getSimplifiedTenantProfile()
    return {
      title: {
        template: `%s | ${platformName}`,
        default: `${platformName} — Membership & Event Management`,
      },
      description: `${platformName} for membership, event, volunteer, and CRM management.`,
      icons: {
        icon: '/images/icon.png',
        shortcut: '/images/icon.png',
        apple: '/images/icon.png',
      },
      metadataBase: new URL(profile.baseUrls.app),
      alternates: { canonical: '/' },
      robots: { index: true, follow: true },
      openGraph: {
        title: `${platformName} — Membership & Event Management`,
        description: `${platformName} for membership, event, volunteer, and CRM management.`,
        type: 'website',
        locale: profile.locale.defaultLocale.replace('-', '_'),
        url: profile.baseUrls.app,
      },
    }
  } catch {
    return {
      title: `${platformName} — Membership & Event Management`,
      description: `${platformName} for membership, event, volunteer, and CRM management.`,
    }
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up'

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}
      signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}
      signInForceRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL}
      signUpForceRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider>
            {children}
            <Toaster richColors closeButton />
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
