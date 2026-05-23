import { NextResponse } from 'next/server'
import { isAppTestAuthEnabled } from '@/lib/auth/auth-provider'
import { resetTestAuthState } from '@/lib/auth/test-auth-state'

export async function POST() {
  if (!isAppTestAuthEnabled()) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  resetTestAuthState()
  return NextResponse.json({ success: true })
}
