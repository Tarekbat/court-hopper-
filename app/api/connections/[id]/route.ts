import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { notifyUser } from '@/lib/push-notification'

const patchSchema = z.object({
  status: z.enum(['accepted', 'declined']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: row, error: getErr } = await supabase
      .from('player_connections')
      .select('id, requester_id, recipient_id, status')
      .eq('id', id)
      .maybeSingle()

    if (getErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (row.recipient_id !== session.user.id) {
      return NextResponse.json({ error: 'Only recipient can respond' }, { status: 403 })
    }
    if (row.status !== 'pending') {
      return NextResponse.json({ error: `Already ${row.status}` }, { status: 409 })
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('player_connections')
      .update({
        status: parsed.data.status,
        acted_by: session.user.id,
        acted_at: now,
      })
      .eq('id', id)
      .select('id, requester_id, recipient_id, status, acted_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try {
      const admin = createAdminClient()
      const { data: actor } = await admin
        .from('users')
        .select('name')
        .eq('id', session.user.id)
        .maybeSingle()
      const accepted = parsed.data.status === 'accepted'
      await notifyUser(admin, {
        user_id: row.requester_id,
        category: 'social',
        type: accepted ? 'connection_accepted' : 'connection_declined',
        title: accepted
          ? `${actor?.name || 'Player'} accepted your connection`
          : `${actor?.name || 'Player'} declined your connection`,
        body: accepted ? 'You are now connected.' : null,
        link_url: accepted ? `/players/${row.recipient_id}` : '/notifications',
        metadata: { connection_id: row.id, to_user_id: row.recipient_id },
      })
    } catch (e) {
      console.error('connection response notify failed:', e)
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/connections/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
