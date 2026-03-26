import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'
import { z } from 'zod'

function getRequestIp(request: NextRequest) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')

const signinSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signinSchema.parse(body)

    // Rate limit / lockout (server-side, atomic)
    const ip = getRequestIp(request)
    const { createAdminClient } = await import('@/lib/supabase-server')
    const admin = createAdminClient()
    const { data: rlData, error: rlError } = await admin.rpc('auth_check_and_increment', {
      p_kind: 'signin',
      p_identifier: validatedData.email,
      p_ip: ip,
      p_max_attempts: 5,
      p_window_seconds: 900,
      p_block_seconds: 900,
    })
    if (rlError) {
      console.error('Rate limit check failed:', rlError)
      // Fail open (do not block sign-in if limiter has an issue)
    } else if (Array.isArray(rlData) && rlData[0] && rlData[0].allowed === false) {
      const retryAfter = Number(rlData[0].retry_after_seconds || 900)
      return NextResponse.json(
        { error: 'Too many failed attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const { user, session } = await signIn(validatedData.email, validatedData.password)

    if (!user || !session) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get user metadata
    const { createServerSupabaseClient } = await import('@/lib/supabase-server')
    const supabase = createServerSupabaseClient()
    const { data: userData } = await supabase
      .from('users')
      .select('id, name, email, image')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: userData?.name || user.user_metadata?.name || null,
        image: userData?.image || user.user_metadata?.avatar_url || null,
      },
      session,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error signing in:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

