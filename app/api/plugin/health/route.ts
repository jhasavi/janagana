import { NextRequest, NextResponse } from 'next/server'
import { resolvePluginTenantContext } from '@/lib/plugin-auth'

/**
 * GET /api/plugin/health
 * Validates the API key and returns tenant info.
 * Useful for integrators to verify their key is correct before going live.
 */
export async function GET(request: NextRequest) {
  const result = await resolvePluginTenantContext(request)
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        hint: 'Pass your API key as the x-api-key header or Authorization: Bearer <key>',
      },
      { status: result.status }
    )
  }

  const { tenant } = result.context
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://janagana.namasteneedham.com'
  return NextResponse.json({
    ok: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    },
    apiBase: `${appBase}/api/plugin`,
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
