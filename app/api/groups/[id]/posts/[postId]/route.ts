import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const patchSchema = z.object({
  pinned: z.boolean().optional(),
})

export async function PATCH(
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
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: post, error: fetchErr } = await supabase
      .from('group_posts')
      .select('id, group_id, author_id')
      .eq('id', postId)
      .eq('group_id', groupId)
      .single()

    if (fetchErr || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: { pinned?: boolean } = {}
    if (parsed.data.pinned !== undefined) {
      updates.pinned = parsed.data.pinned
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { data: adminRow } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    const { data: grp } = await supabase.from('groups').select('created_by').eq('id', groupId).single()
    const isAdmin =
      adminRow?.role === 'admin' || grp?.created_by === session.user.id

    if (parsed.data.pinned !== undefined && !isAdmin) {
      return NextResponse.json({ error: 'Only admins can pin' }, { status: 403 })
    }

    const { error } = await supabase.from('group_posts').update(updates).eq('id', postId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH post:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { data: post, error: fetchErr } = await supabase
      .from('group_posts')
      .select('id, author_id')
      .eq('id', postId)
      .eq('group_id', groupId)
      .single()

    if (fetchErr || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabase.from('group_posts').delete().eq('id', postId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE post:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
