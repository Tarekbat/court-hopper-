import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'
import { z } from 'zod'

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signinSchema.parse(body)

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

