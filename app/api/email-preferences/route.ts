import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  return NextResponse.json(
    data ?? {
      user_id: session.user.id,
      email_welcome: true,
      email_match_requests: true,
      email_group_invites: true,
      email_play_day_reminders: true,
      email_weekly_digest: true,
      email_digest_frequency: 'weekly',
    }
  )
}

export async function PUT(request: NextRequest) {
  const supabase = createServerSupabaseClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  const { error } = await supabase.from('user_notification_preferences').upsert({
    user_id: session.user.id,
    email_welcome: body.email_welcome !== false,
    email_match_requests: body.email_match_requests !== false,
    email_group_invites: body.email_group_invites !== false,
    email_play_day_reminders: body.email_play_day_reminders !== false,
    email_weekly_digest: body.email_weekly_digest !== false,
    email_digest_frequency: body.email_digest_frequency || 'weekly',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
