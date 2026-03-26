import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export type RequireAuthResult = {
  supabase: ReturnType<typeof createServerSupabaseClient>
  session: NonNullable<Awaited<ReturnType<ReturnType<typeof createServerSupabaseClient>['auth']['getSession']>>['data']['session']>
}

function isEmailVerified(session: RequireAuthResult['session']) {
  // Supabase user fields:
  // - email_confirmed_at is set when the email is verified
  // - confirmed_at may also be present depending on provider
  const u: any = session.user as any
  return Boolean(u?.email_confirmed_at || u?.confirmed_at)
}

export async function requireAuth(
  request: NextRequest,
  opts: { requireVerifiedEmail?: boolean } = {}
): Promise<RequireAuthResult | NextResponse> {
  const supabase = createServerSupabaseClient(request)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (opts.requireVerifiedEmail && !isEmailVerified(session)) {
    return NextResponse.json(
      { error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' },
      { status: 403 }
    )
  }

  return { supabase, session } as RequireAuthResult
}

