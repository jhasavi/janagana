import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, message, context } = body as {
      name?: string
      email?: string
      message?: string
      context?: string
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.info('[support/submit]', { name, email, context, message })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[support/submit]', error)
    return NextResponse.json({ error: 'Failed to submit support request' }, { status: 500 })
  }
}
