import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getBlockedUserIds } from '@/lib/moderation'
import { isFeatureEnabled } from '@/lib/feature-flags'

async function unreadCount(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  threadId: string,
  userId: string,
  lastRead: string | null
) {
  let q = supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', threadId)
    .neq('sender_id', userId)
  if (lastRead) q = q.gt('created_at', lastRead)
  const { count } = await q
  return count ?? 0
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isFeatureEnabled('chat'))) {
      return NextResponse.json({ threads: [] })
    }
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const me = session.user.id
    const blockedIds = await getBlockedUserIds(supabase as any, me)

    const { data: memberships, error: meErr } = await supabase
      .from('chat_thread_members')
      .select('thread_id, last_read_at')
      .eq('user_id', me)
    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 })

    const threadIds = (memberships ?? []).map((m: { thread_id: string }) => m.thread_id)
    const lastReadMap = Object.fromEntries(
      (memberships ?? []).map((m: { thread_id: string; last_read_at: string | null }) => [
        m.thread_id,
        m.last_read_at,
      ])
    )

    if (threadIds.length === 0) return NextResponse.json({ threads: [] })

    const { data: threads, error: te } = await supabase
      .from('chat_threads')
      .select('id, thread_kind, group_id, direct_pair_key, updated_at')
      .in('id', threadIds)
    if (te) return NextResponse.json({ error: te.message }, { status: 500 })

    const shaped = await Promise.all(
      (threads ?? []).map(async (t: any) => {
        const tid = t.id as string
        const lastRead = lastReadMap[tid] ?? null

        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('body, created_at, sender_id')
          .eq('thread_id', tid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        let title = 'Chat'
        let subtitle = lastMsg?.body?.slice(0, 80) ?? 'No messages yet'

        if (t.thread_kind === 'group' && t.group_id) {
          const { data: g } = await supabase.from('groups').select('name').eq('id', t.group_id).maybeSingle()
          title = g?.name ? `${g.name} (group)` : 'Group chat'
        } else if (t.thread_kind === 'direct') {
          const { data: others } = await supabase
            .from('chat_thread_members')
            .select('user_id')
            .eq('thread_id', tid)
            .neq('user_id', me)
          const oid = others?.[0]?.user_id
          if (oid) {
            if (blockedIds.has(oid)) return null
            const { data: u } = await supabase.from('users').select('name').eq('id', oid).maybeSingle()
            title = u?.name || 'Player'
          } else {
            title = 'Direct message'
          }
        }

        const unread = await unreadCount(supabase, tid, me, lastRead)

        return {
          id: tid,
          kind: t.thread_kind,
          group_id: t.group_id,
          title,
          last_message_preview: subtitle,
          last_message_at: lastMsg?.created_at ?? t.updated_at,
          unread_count: unread,
        }
      })
    )

    const visible = shaped.filter((row): row is NonNullable<typeof row> => Boolean(row))
    visible.sort((a, b) => {
      const ta = new Date(a.last_message_at).getTime()
      const tb = new Date(b.last_message_at).getTime()
      return tb - ta
    })

    return NextResponse.json({ threads: visible })
  } catch (err) {
    console.error('GET /api/chat/threads:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
