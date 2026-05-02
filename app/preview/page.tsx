import Link from 'next/link'

const pages = [
  { href: '/preview/sidebar', label: 'Sidebar grouped navigation' },
  { href: '/preview/contacts', label: 'Contacts page' },
  { href: '/preview/membership-create', label: 'Membership create flow' },
  { href: '/preview/global-create', label: 'Global + Create modal' },
  { href: '/preview/org-console', label: 'Organization Console main page' },
  { href: '/preview/bulk-operations', label: 'Bulk Operations page' },
  { href: '/preview/import-center', label: 'Import Center page' },
  { href: '/preview/data-cleanup', label: 'Data Cleanup page' },
]

export default function PreviewIndexPage() {
  return (
    <main className="max-w-3xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">JanaGana UI Preview Harness</h1>
      <p className="text-sm text-muted-foreground">
        These preview routes are render-only evidence pages for QA screenshots in a non-authenticated local session.
      </p>
      <ul className="space-y-2">
        {pages.map((page) => (
          <li key={page.href}>
            <Link className="text-blue-600 underline" href={page.href}>{page.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
