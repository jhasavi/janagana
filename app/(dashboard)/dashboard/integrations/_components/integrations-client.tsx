'use client'

import { useMemo, useState } from 'react'
import { Copy, CheckCircle2, Loader2, ShieldCheck, Key } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Platform = 'html' | 'wordpress' | 'nextjs' | 'wix' | 'squarespace' | 'shopify' | 'api'
type Widget = 'newsletter' | 'events' | 'login' | 'course' | 'portal-link'

interface IntegrationsClientProps {
  tenantSlug: string
  appBaseUrl: string
}

interface PlatformConfig {
  label: string
  whoFor: string
  installSteps: string[]
}

const platformConfigs: Record<Platform, PlatformConfig> = {
  html: {
    label: 'Generic HTML',
    whoFor: 'Website owners with access to site HTML',
    installSteps: [
      'Paste script and Janagana.init in site head or footer',
      'Paste widget container + widget call where needed',
      'Publish and run one test submission',
    ],
  },
  wordpress: {
    label: 'WordPress',
    whoFor: 'Admins using Gutenberg, Elementor, or Divi',
    installSteps: [
      'Add script in header via WPCode or header/footer plugin',
      'Use Custom HTML block for widget code',
      'Publish page and verify CRM contact creation',
    ],
  },
  nextjs: {
    label: 'Next.js',
    whoFor: 'Developers integrating with React components',
    installSteps: [
      'Load script with next/script in root layout',
      'Initialize once with tenantSlug + apiUrl',
      'Render widgets from client components',
    ],
  },
  wix: {
    label: 'Wix',
    whoFor: 'No-code site builders using Wix dashboard',
    installSteps: [
      'Add script in Settings > Tracking & Analytics (Head)',
      'Add Embed Code element to page',
      'Paste widget code and publish',
    ],
  },
  squarespace: {
    label: 'Squarespace',
    whoFor: 'Site owners using Code Injection and Code Blocks',
    installSteps: [
      'Add script in Settings > Advanced > Code Injection',
      'Paste widget code in page Code Block',
      'Publish and verify data in CRM',
    ],
  },
  shopify: {
    label: 'Shopify',
    whoFor: 'Store admins editing theme and custom liquid blocks',
    installSteps: [
      'Add script to theme head in theme.liquid',
      'Add widget via Custom Liquid section',
      'Test lead capture and events rendering',
    ],
  },
  api: {
    label: 'API / Custom App',
    whoFor: 'Developers building backend integrations',
    installSteps: [
      'Create API key in Settings > API Keys',
      'Use /api/plugin endpoints with X-API-Key',
      'Validate contact creation and event registration sync',
    ],
  },
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.success('Copied')
}

function getInitSnippet(baseUrl: string, tenantSlug: string, apiKey?: string) {
  return `<script src="${baseUrl}/janagana-embed.js"></script>\n<script>\n  Janagana.init({\n    tenantSlug: '${tenantSlug || 'your-tenant-slug'}',\n    apiUrl: '${baseUrl}',\n    apiKey: '${apiKey || 'YOUR_API_KEY'}'\n  });\n</script>`
}

function getWidgetSnippet(baseUrl: string, tenantSlug: string, widget: Widget) {
  if (widget === 'newsletter') {
    return `<div id="newsletter-widget"></div>\n<script>\n  Janagana.newsletter('newsletter-widget', {\n    title: 'Subscribe to our newsletter',\n    description: 'Get updates delivered to your inbox'\n  });\n</script>`
  }

  if (widget === 'events') {
    return `<div id="events-widget"></div>\n<script>\n  Janagana.events('events-widget', {\n    title: 'Upcoming Events',\n    showDetails: true,\n    showCalendar: true,\n    maxItems: 6,\n    emptyStateText: 'No events scheduled yet. Please check back soon.'\n  });\n</script>`
  }

  if (widget === 'login') {
    return `<div id="login-widget"></div>\n<script>\n  Janagana.login('login-widget', { title: 'Member Login' });\n</script>`
  }

  if (widget === 'course') {
    return `<div id="course-widget"></div>\n<script>\n  Janagana.course('course-widget', {\n    title: 'Enroll in Course',\n    description: 'Enter your details to get started',\n    courseId: 'optional-course-id'\n  });\n</script>`
  }

  return `${baseUrl}/portal/${tenantSlug || 'your-tenant-slug'}`
}

function getApiSnippet(baseUrl: string, apiKey?: string) {
  const key = apiKey || 'YOUR_API_KEY'
  return `# Test connection\ncurl -H "X-API-Key: ${key}" \\\n  ${baseUrl}/api/plugin/health\n\n# Fetch events\ncurl -H "X-API-Key: ${key}" \\\n  ${baseUrl}/api/plugin/events\n\n# Create contact\ncurl -X POST ${baseUrl}/api/plugin/crm/contacts \\\n  -H "X-API-Key: ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "firstName": "Priya",\n    "lastName": "Shah",\n    "email": "priya@example.com",\n    "source": "website"\n  }'`
}

export function IntegrationsClient({ tenantSlug, appBaseUrl }: IntegrationsClientProps) {
  const [platform, setPlatform] = useState<Platform>('html')
  const [widget, setWidget] = useState<Widget>('newsletter')
  const [apiKey, setApiKey] = useState('')
  const [keyVerified, setKeyVerified] = useState(false)
  const [keyTesting, setKeyTesting] = useState(false)
  const [checks, setChecks] = useState({
    scriptInstalled: false,
    widgetVisible: false,
    testSubmitted: false,
    crmVerified: false,
  })

  const activeKey = keyVerified ? apiKey.trim() : undefined
  const config = platformConfigs[platform]
  const initSnippet = useMemo(() => getInitSnippet(appBaseUrl, tenantSlug, activeKey), [appBaseUrl, tenantSlug, activeKey])
  const widgetSnippet = useMemo(() => getWidgetSnippet(appBaseUrl, tenantSlug, widget), [appBaseUrl, tenantSlug, widget])
  const apiSnippet = useMemo(() => getApiSnippet(appBaseUrl, activeKey), [appBaseUrl, activeKey])

  async function testApiKey() {
    const key = apiKey.trim()
    if (!key) return
    setKeyTesting(true)
    try {
      const res = await fetch(`${appBaseUrl}/api/plugin/health`, {
        headers: { 'X-API-Key': key },
      })
      const json = await res.json()
      if (json.ok) {
        setKeyVerified(true)
        toast.success(`API key verified for tenant: ${json.tenant?.name ?? tenantSlug}`)
      } else {
        setKeyVerified(false)
        toast.error(`Key rejected: ${json.error ?? 'Invalid key'}`)
      }
    } catch {
      toast.error('Could not reach the API. Check your network.')
    } finally {
      setKeyTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* API Key Setup Panel */}
      <Card className="border-indigo-200 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> Step 0: Connect Your API Key
          </CardTitle>
          <CardDescription>
            Paste your API key here to auto-populate all snippets below.{' '}
            <Link href="/dashboard/settings/api-keys" className="underline underline-offset-2 text-indigo-700 dark:text-indigo-300">
              Get or create a key →
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="api-key-input" className="sr-only">API Key</Label>
              <Input
                id="api-key-input"
                type="password"
                placeholder="jg_live_..."
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setKeyVerified(false) }}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={testApiKey} disabled={!apiKey.trim() || keyTesting} variant="outline">
              {keyTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {keyTesting ? 'Testing…' : 'Test Key'}
            </Button>
          </div>
          {keyVerified && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Key verified — snippets below are populated with your key.
            </p>
          )}
          {!keyVerified && apiKey.trim() === '' && (
            <p className="text-xs text-muted-foreground">Snippets will show <code className="bg-muted px-1 rounded">YOUR_API_KEY</code> until you paste and verify your key.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Canonical Integration Values</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Tenant Slug</p>
              <p className="font-mono text-sm">{tenantSlug || 'No tenant slug set yet'}</p>
            </div>
            {tenantSlug && <Button variant="outline" size="sm" onClick={() => copyText(tenantSlug)}><Copy className="h-4 w-4" />Copy</Button>}
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Script URL</p>
              <p className="font-mono text-sm">{appBaseUrl}/janagana-embed.js</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => copyText(`${appBaseUrl}/janagana-embed.js`)}><Copy className="h-4 w-4" />Copy</Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">API Base URL</p>
              <p className="font-mono text-sm">{appBaseUrl}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => copyText(appBaseUrl)}><Copy className="h-4 w-4" />Copy</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Selector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(platformConfigs) as Platform[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={platform === key ? 'default' : 'outline'}
                onClick={() => setPlatform(key)}
              >
                {platformConfigs[key].label}
              </Button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">{config.whoFor}</p>
            {config.installSteps.map((step) => (
              <p key={step} className="text-sm">- {step}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      {platform !== 'api' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Install Script</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea className="min-h-[140px] font-mono text-xs" readOnly value={initSnippet} />
              <Button size="sm" onClick={() => copyText(initSnippet)}><Copy className="h-4 w-4" />Copy Script + Init</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Widget Snippet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(['newsletter', 'events', 'login', 'course', 'portal-link'] as Widget[]).map((w) => (
                  <Button
                    key={w}
                    size="sm"
                    variant={widget === w ? 'default' : 'outline'}
                    onClick={() => setWidget(w)}
                  >
                    {w === 'portal-link' ? 'Portal Link' : w[0].toUpperCase() + w.slice(1)}
                  </Button>
                ))}
              </div>
              <Textarea className="min-h-[170px] font-mono text-xs" readOnly value={widgetSnippet} />
              <Button size="sm" onClick={() => copyText(widgetSnippet)}><Copy className="h-4 w-4" />Copy Widget Snippet</Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>API Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate an API key in Settings → API Keys, then call plugin APIs from your backend.
            </p>
            <Textarea className="min-h-[220px] font-mono text-xs" readOnly value={apiSnippet} />
            <Button size="sm" onClick={() => copyText(apiSnippet)}><Copy className="h-4 w-4" />Copy API Commands</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Integration Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { key: 'scriptInstalled' as const, label: 'Script added to site' },
            { key: 'widgetVisible' as const, label: 'Widget renders on published page' },
            { key: 'testSubmitted' as const, label: 'Test lead/event action completed' },
            { key: 'crmVerified' as const, label: 'CRM data verified in JanaGana' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={checks[item.key]}
                onChange={(e) => setChecks((prev) => ({ ...prev, [item.key]: e.target.checked }))}
              />
              {item.label}
              {checks[item.key] && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Happens in CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>- Newsletter submissions create/update contacts (source: newsletter).</p>
          <p>- Course submissions create/update contacts (source: course_enrollment).</p>
          <p>- Events widget reads published upcoming events.</p>
          <p>- Event registrations create CRM activities in timeline.</p>
          <p>- Portal flows connect member actions to CRM/member records.</p>
          <div className="pt-2">
            <Badge variant="secondary">Use this after every test install</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
