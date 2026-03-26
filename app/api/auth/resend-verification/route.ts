import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-server'

function getRequestIp(request: NextRequest) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = schema.parse(body)

    const admin = createAdminClient()

    // Reuse signup limiter (prevents email spam)
    const ip = getRequestIp(request)
    const { data: rlData } = await admin.rpc('auth_check_and_increment', {
      p_kind: 'signup',
      p_identifier: email,
      p_ip: ip,
      p_max_attempts: 5,
      p_window_seconds: 900,
      p_block_seconds: 900,
    })
    if (Array.isArray(rlData) && rlData[0] && rlData[0].allowed === false) {
      const retryAfter = Number(rlData[0].retry_after_seconds || 900)
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Supabase supports resend for 'signup' confirmations
    const { error } = await admin.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      // Do not leak whether the email exists
      console.error('resend verification error:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error in POST /api/auth/resend-verification:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

