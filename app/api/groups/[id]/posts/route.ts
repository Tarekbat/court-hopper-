import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { hasProfanity } from '@/lib/moderation'

const postBodySchema = z.object({
  body: z.string().min(1).max(5000),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const { id: groupId } = await params

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: posts, error } = await supabase
      .from('group_posts')
      .select(
        `
        id,
        group_id,
        author_id,
        body,
        pinned,
        created_at,
        updated_at,
        author:users!group_posts_author_id_fkey ( id, name, image )
      `
      )
      .eq('group_id', groupId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const list = posts ?? []
    const postIds = list.map((p: { id: string }) => p.id)
    let commentCounts: Record<string, number> = {}
    let reactionAgg: Record<string, { like: number; celebrate: number; fire: number }> = {}
    let myReactions: Record<string, string | null> = {}

    if (postIds.length > 0) {
      const [commentsRes, reactsRes] = await Promise.all([
        supabase.from('group_post_comments').select('post_id').in('post_id', postIds),
        supabase.from('group_post_reactions').select('post_id, emoji, user_id').in('post_id', postIds),
      ])
      commentsRes.data?.forEach((r: { post_id: string }) => {
        commentCounts[r.post_id] = (commentCounts[r.post_id] ?? 0) + 1
      })
      reactsRes.data?.forEach((r: { post_id: string; emoji: string; user_id: string }) => {
        if (!reactionAgg[r.post_id]) {
          reactionAgg[r.post_id] = { like: 0, celebrate: 0, fire: 0 }
        }
        const em = r.emoji as 'like' | 'celebrate' | 'fire'
        if (reactionAgg[r.post_id][em] != null) reactionAgg[r.post_id][em] += 1
        if (r.user_id === session.user.id) myReactions[r.post_id] = r.emoji
      })
    }

    const shaped = list.map((p: any) => ({
      id: p.id,
      author_id: p.author_id,
      body: p.body,
      pinned: p.pinned,
      created_at: p.created_at,
      author: p.author
        ? { id: p.author.id, name: p.author.name ?? null, image: p.author.image ?? null }
        : null,
      comment_count: commentCounts[p.id] ?? 0,
      reactions: reactionAgg[p.id] ?? { like: 0, celebrate: 0, fire: 0 },
      my_reaction: myReactions[p.id] ?? null,
    }))

    return NextResponse.json({ posts: shaped })
  } catch (err) {
    console.error('GET /api/groups/[id]/posts:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const { id: groupId } = await params

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = postBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    if (hasProfanity(parsed.data.body)) {
      return NextResponse.json({ error: 'Please remove inappropriate language.' }, { status: 400 })
    }

    const { data: row, error } = await supabase
      .from('group_posts')
      .insert({
        group_id: groupId,
        author_id: session.user.id,
        body: parsed.data.body.trim(),
      })
      .select(
        `
        id,
        group_id,
        author_id,
        body,
        pinned,
        created_at,
        author:users!group_posts_author_id_fkey ( id, name, image )
      `
      )
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const p = row as any
    return NextResponse.json({
      post: {
        id: p.id,
        author_id: p.author_id,
        body: p.body,
        pinned: p.pinned,
        created_at: p.created_at,
        author: p.author
          ? { id: p.author.id, name: p.author.name ?? null, image: p.author.image ?? null }
          : null,
        comment_count: 0,
        reactions: { like: 0, celebrate: 0, fire: 0 },
        my_reaction: null,
      },
    })
  } catch (err) {
    console.error('POST /api/groups/[id]/posts:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
