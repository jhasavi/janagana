import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { TenantProvider } from '@/context/TenantContext';
import { getCurrentTenant } from '@/lib/tenant';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Jana Gana',
    template: '%s | Jana Gana',
  },
  description: 'Membership, event, volunteer, and club management platform',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant();

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: tenant?.primaryColor ?? '#2563EB',
          borderRadius: '0.5rem',
        },
      }}
    >
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <body className="min-h-screen bg-background font-sans antialiased">
          <TenantProvider tenant={tenant}>
            {children}
          </TenantProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
