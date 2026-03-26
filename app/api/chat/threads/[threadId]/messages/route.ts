import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getBlockedUserIds, isBlockedEitherWay } from '@/lib/moderation'
import { isFeatureEnabled } from '@/lib/feature-flags'

const postSchema = z.object({
  body: z.string().min(1).max(4000),
  embed_match_id: z.string().uuid().optional().nullable(),
  quick_reply_key: z.string().max(64).optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    if (!(await isFeatureEnabled('chat'))) {
      return NextResponse.json({ messages: [] })
    }
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { threadId } = await params

    const { data: mem } = await supabase
      .from('chat_thread_members')
      .select('thread_id')
      .eq('thread_id', threadId)
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: members } = await supabase.from('chat_thread_members').select('user_id').eq('thread_id', threadId)
    const directPeerId =
      (members ?? []).find((m: { user_id: string }) => m.user_id !== session.user.id)?.user_id ?? null
    if (directPeerId && (await isBlockedEitherWay(supabase as any, session.user.id, directPeerId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 80))

    const { data: rows, error } = await supabase
      .from('chat_messages')
      .select('id, thread_id, sender_id, body, embed_match_id, quick_reply_key, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const senderIds = Array.from(new Set((rows ?? []).map((r: { sender_id: string }) => r.sender_id)))
    let senderMap: Record<string, { id: string; name: string | null; image: string | null }> = {}
    if (senderIds.length) {
      const { data: users } = await supabase.from('users').select('id, name, image').in('id', senderIds)
      users?.forEach((u: { id: string; name: string | null; image: string | null }) => {
        senderMap[u.id] = { id: u.id, name: u.name ?? null, image: u.image ?? null }
      })
    }

    const blockedIds = await getBlockedUserIds(supabase as any, session.user.id)
    const messages = (rows ?? [])
      .filter((r: any) => !blockedIds.has(r.sender_id))
      .map((r: any) => ({
      id: r.id,
      thread_id: r.thread_id,
      sender_id: r.sender_id,
      body: r.body,
      embed_match_id: r.embed_match_id,
      quick_reply_key: r.quick_reply_key,
      created_at: r.created_at,
      sender: senderMap[r.sender_id] ?? { id: r.sender_id, name: null, image: null },
      }))

    return NextResponse.json({ messages })
  } catch (err) {
    console.error('GET messages:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    if (!(await isFeatureEnabled('chat'))) {
      return NextResponse.json({ error: 'Chat is temporarily unavailable' }, { status: 503 })
    }
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { threadId } = await params
    const parsed = postSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: mem } = await supabase
      .from('chat_thread_members')
      .select('thread_id')
      .eq('thread_id', threadId)
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: members } = await supabase.from('chat_thread_members').select('user_id').eq('thread_id', threadId)
    const directPeerId =
      (members ?? []).find((m: { user_id: string }) => m.user_id !== session.user.id)?.user_id ?? null
    if (directPeerId && (await isBlockedEitherWay(supabase as any, session.user.id, directPeerId))) {
      return NextResponse.json({ error: 'Cannot message this user' }, { status: 403 })
    }

    let embedMatchId = parsed.data.embed_match_id ?? null
    if (embedMatchId) {
      const { data: match } = await supabase
        .from('player_matches')
        .select('id')
        .eq('id', embedMatchId)
        .or(`player_a_id.eq.${session.user.id},player_b_id.eq.${session.user.id}`)
        .maybeSingle()
      if (!match) return NextResponse.json({ error: 'Invalid match' }, { status: 400 })
    }

    const { data: row, error } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: session.user.id,
        body: parsed.data.body.trim(),
        embed_match_id: embedMatchId,
        quick_reply_key: parsed.data.quick_reply_key ?? null,
      })
      .select('id, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase
      .from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId)

    return NextResponse.json(row)
  } catch (err) {
    console.error('POST messages:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
