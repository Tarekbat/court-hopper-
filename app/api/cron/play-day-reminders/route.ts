import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  if (process.env.CRON_SECRET && request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const start = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
  const end = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
  const { data: events } = await admin
    .from('group_events')
    .select('id, group_id, title, starts_at')
    .gte('starts_at', start)
    .lte('starts_at', end)

  for (const ev of events ?? []) {
    const { data: members } = await admin.from('group_members').select('user_id').eq('group_id', ev.group_id)
    const ids = (members ?? []).map((m: any) => m.user_id)
    if (!ids.length) continue
    const { data: users } = await admin.from('users').select('id, email, name').in('id', ids)
    for (const u of users ?? []) {
      if (!u.email) continue
      await sendEmail({
        to: u.email,
        subject: `Reminder: ${ev.title || 'Play day'} is tomorrow`,
        html: `<p>Hi ${u.name || 'player'}, your group play day starts in about 24 hours.</p>`,
      })
    }
  }

  return NextResponse.json({ ok: true, events: (events ?? []).length })
}
