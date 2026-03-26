import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const me = session.user.id

    const { data: memberships, error: meErr } = await supabase
      .from('chat_thread_members')
      .select('thread_id, last_read_at')
      .eq('user_id', me)
    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 })

    let total = 0
    for (const m of memberships ?? []) {
      let q = supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('thread_id', m.thread_id)
        .neq('sender_id', me)
      if (m.last_read_at) q = q.gt('created_at', m.last_read_at)
      const { count } = await q
      total += count ?? 0
    }

    return NextResponse.json({ count: total })
  } catch (err) {
    console.error('GET /api/chat/unread-count:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
