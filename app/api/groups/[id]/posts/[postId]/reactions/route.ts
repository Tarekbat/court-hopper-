import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const emojiSchema = z.enum(['like', 'celebrate', 'fire'])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const { id: groupId, postId } = await params

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = z.object({ emoji: emojiSchema }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { emoji } = parsed.data

    const { data: post, error: pe } = await supabase
      .from('group_posts')
      .select('id')
      .eq('id', postId)
      .eq('group_id', groupId)
      .single()

    if (pe || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: existing } = await supabase
      .from('group_post_reactions')
      .select('id, emoji')
      .eq('post_id', postId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existing && (existing as { emoji: string }).emoji === emoji) {
      await supabase.from('group_post_reactions').delete().eq('id', (existing as { id: string }).id)
    } else if (existing) {
      await supabase
        .from('group_post_reactions')
        .update({ emoji })
        .eq('id', (existing as { id: string }).id)
    } else {
      await supabase.from('group_post_reactions').insert({
        post_id: postId,
        user_id: session.user.id,
        emoji,
      })
    }

    const { data: reacts } = await supabase
      .from('group_post_reactions')
      .select('emoji')
      .eq('post_id', postId)

    const reactions = { like: 0, celebrate: 0, fire: 0 }
    let my_reaction: string | null = null
    reacts?.forEach((r: { emoji: string }) => {
      const e = r.emoji as keyof typeof reactions
      if (reactions[e] != null) reactions[e] += 1
    })
    const { data: mine } = await supabase
      .from('group_post_reactions')
      .select('emoji')
      .eq('post_id', postId)
      .eq('user_id', session.user.id)
      .maybeSingle()
    my_reaction = mine ? (mine as { emoji: string }).emoji : null

    return NextResponse.json({ reactions, my_reaction })
  } catch (err) {
    console.error('POST reaction:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
