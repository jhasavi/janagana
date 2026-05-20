import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { articleSlug, helpful } = body as { articleSlug?: string; helpful?: boolean }

    if (!articleSlug || typeof helpful !== 'boolean') {
      return NextResponse.json({ error: 'Invalid feedback payload' }, { status: 400 })
    }

    console.info('[help/feedback] article:', articleSlug, 'helpful:', helpful)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[help/feedback]', error)
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
  }
}
