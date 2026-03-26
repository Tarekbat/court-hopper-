import { NextRequest, NextResponse } from 'next/server'
import { signUp } from '@/lib/auth'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'

function getRequestIp(request: NextRequest) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((value) => /[a-z]/.test(value), 'Password must include a lowercase letter')
  .refine((value) => /[A-Z]/.test(value), 'Password must include an uppercase letter')
  .refine((value) => /\d/.test(value), 'Password must include a number')

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: strongPasswordSchema,
  age_confirmed_13_plus: z.literal(true),
  accepted_terms: z.literal(true),
  accepted_privacy: z.literal(true),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Rate limit / lockout (server-side, atomic)
    const ip = getRequestIp(request)
    const { createAdminClient } = await import('@/lib/supabase-server')
    const admin = createAdminClient()
    const { data: rlData, error: rlError } = await admin.rpc('auth_check_and_increment', {
      p_kind: 'signup',
      p_identifier: validatedData.email,
      p_ip: ip,
      p_max_attempts: 5,
      p_window_seconds: 900,
      p_block_seconds: 900,
    })
    if (rlError) {
      console.error('Rate limit check failed:', rlError)
      // Fail open
    } else if (Array.isArray(rlData) && rlData[0] && rlData[0].allowed === false) {
      const retryAfter = Number(rlData[0].retry_after_seconds || 900)
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Check if user already exists
    const adminClient = admin
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create user with Supabase Auth.
    // We pass the response into the Supabase server client so auth cookies/session
    // are attached properly to the returned response.
    const res = NextResponse.json({}, { status: 201 })
    const { user, session } = await signUp(
      validatedData.email,
      validatedData.password,
      validatedData.name,
      request,
      res
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    await sendEmail({
      to: validatedData.email,
      subject: 'Welcome to Tennis Scheduler',
      html: `<p>Hi ${validatedData.name}, welcome to Tennis Scheduler.</p><p>Your account is ready.</p>`,
    })

    // Signup page only checks `response.ok` and redirects.
    // Cookies are already set on `res`, so we can return the placeholder body.
    return res
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
