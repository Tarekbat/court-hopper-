import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isBlockedEitherWay } from '@/lib/moderation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { threadId } = await params
    const me = session.user.id

    const { data: mem } = await supabase
      .from('chat_thread_members')
      .select('thread_id')
      .eq('thread_id', threadId)
      .eq('user_id', me)
      .maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: t } = await supabase
      .from('chat_threads')
      .select('id, thread_kind, group_id')
      .eq('id', threadId)
      .single()

    let title = 'Chat'
    if (t?.thread_kind === 'group' && t.group_id) {
      const { data: g } = await supabase.from('groups').select('name').eq('id', t.group_id).maybeSingle()
      title = g?.name ? `${g.name}` : 'Group chat'
    } else if (t?.thread_kind === 'direct') {
      const { data: others } = await supabase
        .from('chat_thread_members')
        .select('user_id')
        .eq('thread_id', threadId)
        .neq('user_id', me)
      const oid = others?.[0]?.user_id
      if (oid) {
        if (await isBlockedEitherWay(supabase as any, me, oid)) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }
        const { data: u } = await supabase.from('users').select('name').eq('id', oid).maybeSingle()
        title = u?.name || 'Player'
      }
    }

    return NextResponse.json({
      id: threadId,
      title,
      kind: t?.thread_kind,
      group_id: t?.group_id,
    })
  } catch (err) {
    console.error('GET thread:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
