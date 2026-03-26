import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { hasProfanity } from '@/lib/moderation'

const commentSchema = z.object({
  body: z.string().min(1).max(2000),
  parent_id: z.string().uuid().optional().nullable(),
})

export async function GET(
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

    const { data: post, error: pe } = await supabase
      .from('group_posts')
      .select('id')
      .eq('id', postId)
      .eq('group_id', groupId)
      .single()

    if (pe || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: rows, error } = await supabase
      .from('group_post_comments')
      .select(
        `
        id,
        post_id,
        author_id,
        parent_id,
        body,
        created_at,
        author:users!group_post_comments_author_id_fkey ( id, name, image )
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const comments = (rows ?? []).map((c: any) => ({
      id: c.id,
      parent_id: c.parent_id,
      author_id: c.author_id,
      body: c.body,
      created_at: c.created_at,
      author: c.author
        ? { id: c.author.id, name: c.author.name ?? null, image: c.author.image ?? null }
        : null,
    }))

    return NextResponse.json({ comments })
  } catch (err) {
    console.error('GET comments:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const parsed = commentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    if (hasProfanity(parsed.data.body)) {
      return NextResponse.json({ error: 'Please remove inappropriate language.' }, { status: 400 })
    }

    const { data: post, error: pe } = await supabase
      .from('group_posts')
      .select('id')
      .eq('id', postId)
      .eq('group_id', groupId)
      .single()

    if (pe || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (parsed.data.parent_id) {
      const { data: parent } = await supabase
        .from('group_post_comments')
        .select('id')
        .eq('id', parsed.data.parent_id)
        .eq('post_id', postId)
        .single()
      if (!parent) return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 })
    }

    const { data: row, error } = await supabase
      .from('group_post_comments')
      .insert({
        post_id: postId,
        author_id: session.user.id,
        body: parsed.data.body.trim(),
        parent_id: parsed.data.parent_id ?? null,
      })
      .select(
        `
        id,
        parent_id,
        author_id,
        body,
        created_at,
        author:users!group_post_comments_author_id_fkey ( id, name, image )
      `
      )
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const c = row as any
    return NextResponse.json({
      comment: {
        id: c.id,
        parent_id: c.parent_id,
        author_id: c.author_id,
        body: c.body,
        created_at: c.created_at,
        author: c.author
          ? { id: c.author.id, name: c.author.name ?? null, image: c.author.image ?? null }
          : null,
      },
    })
  } catch (err) {
    console.error('POST comment:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
