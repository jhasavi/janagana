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

function MissingClerkConfiguration() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Clerk setup is required</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to the environment before opening sign-in, onboarding, or dashboard pages.
        </p>
      </section>
    </main>
  )
}

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
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up'

  const pageContent = publishableKey ? children : <MissingClerkConfiguration />

  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {pageContent}
          <Toaster richColors closeButton />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )

  if (!publishableKey) {
    return content
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      afterSignOutUrl="/api/sign-out"
      signInFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}
      signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}
      signInForceRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL}
      signUpForceRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL}
    >
      {content}
    </ClerkProvider>
  )
}
