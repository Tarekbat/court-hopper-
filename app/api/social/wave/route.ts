import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { ensureDirectThread } from '@/lib/social-graph'
import { notifyUser } from '@/lib/push-notification'

const bodySchema = z.object({
  to_user_id: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { to_user_id } = parsed.data
    if (to_user_id === session.user.id) {
      return NextResponse.json({ error: 'Cannot wave at yourself' }, { status: 400 })
    }

    const { data: target } = await supabase.from('users').select('id').eq('id', to_user_id).maybeSingle()
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { data: me } = await supabase.from('users').select('name').eq('id', session.user.id).single()
    const fromName = me?.name || 'A player'

    const admin = createAdminClient()
    const threadId = await ensureDirectThread(admin, session.user.id, to_user_id)

    const waveBody = `👋 ${fromName} waved — want to hit?`
    const { error: msgErr } = await admin.from('chat_messages').insert({
      thread_id: threadId,
      sender_id: session.user.id,
      body: waveBody,
      quick_reply_key: 'wave',
    })
    if (msgErr) {
      console.error('wave message:', msgErr)
      return NextResponse.json({ error: msgErr.message }, { status: 500 })
    }

    await notifyUser(admin, {
      user_id: to_user_id,
      category: 'social',
      type: 'wave',
      title: `${fromName} waved at you`,
      body: 'Open Messages to reply or say hi.',
      link_url: `/messages/${threadId}`,
      metadata: { from_user_id: session.user.id },
    })

    return NextResponse.json({ thread_id: threadId })
  } catch (err) {
    console.error('POST /api/social/wave:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
