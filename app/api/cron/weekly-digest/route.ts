import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  if (process.env.CRON_SECRET && request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: prefs } = await admin
    .from('user_notification_preferences')
    .select('user_id, email_digest_frequency, email_weekly_digest')
    .eq('email_weekly_digest', true)
    .neq('email_digest_frequency', 'off')

  const userIds = (prefs ?? [])
    .filter((p: any) => p.email_digest_frequency === 'weekly')
    .map((p: any) => p.user_id)

  if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 })

  const { data: users } = await admin.from('users').select('id, email, name').in('id', userIds)
  for (const u of users ?? []) {
    if (!u.email) continue
    const { count: notifCount } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .gte('created_at', weekAgo)

    await sendEmail({
      to: u.email,
      subject: 'Your weekly Tennis Scheduler digest',
      html: `<p>Hi ${u.name || 'player'}, you had ${notifCount ?? 0} new updates this week.</p>`,
    })
  }
  return NextResponse.json({ ok: true, sent: (users ?? []).length })
}
