import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { ensureDirectThread } from '@/lib/social-graph'
import { notifyUser } from '@/lib/push-notification'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (status !== 'accepted' && status !== 'declined') {
      return NextResponse.json({ error: 'status must be accepted or declined' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('play_requests')
      .select('from_user_id, to_user_id, sport_id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (existing.to_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the recipient can respond' }, { status: 403 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Request already responded' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('play_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating play request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      const admin = createAdminClient()
      const fromId = existing.from_user_id as string
      const toId = existing.to_user_id as string
      const sportId = existing.sport_id as string

      if (status === 'accepted') {
        const { data: matchRow, error: me } = await admin
          .from('player_matches')
          .insert({
            play_request_id: id,
            player_a_id: fromId,
            player_b_id: toId,
            sport_id: sportId,
            match_type: 'singles',
            status: 'scheduled',
          })
          .select('id')
          .single()
        if (!me && matchRow?.id) {
          const threadId = await ensureDirectThread(admin, fromId, toId)
          await admin.from('chat_messages').insert({
            thread_id: threadId,
            sender_id: session.user.id,
            body: '🎾 Accepted your play request! Plan a time in Matches or chat here.',
            embed_match_id: matchRow.id,
          })
          await admin.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)
          const { data: accepter } = await admin.from('users').select('name').eq('id', session.user.id).maybeSingle()
          await notifyUser(admin, {
            user_id: fromId,
            category: 'matches',
            type: 'play_request_accepted',
            title: `${accepter?.name || 'Your partner'} accepted`,
            body: 'You have a new match — open Messages or Matches.',
            link_url: `/messages/${threadId}`,
            metadata: { match_id: matchRow.id, thread_id: threadId },
          })
        } else if (me) {
          console.error('player_matches insert:', me)
        }
      } else if (status === 'declined') {
        await notifyUser(admin, {
          user_id: fromId,
          category: 'matches',
          type: 'play_request_declined',
          title: 'Play request declined',
          body: 'You can send another invite from Find players.',
          link_url: '/find-players',
          metadata: { play_request_id: id },
        })
      }
    } catch (e) {
      console.error('play_request accept side-effects:', e)
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in PATCH /api/play-requests/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
