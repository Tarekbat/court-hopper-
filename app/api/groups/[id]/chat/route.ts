import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { ensureGroupChatThread, syncGroupChatMembers } from '@/lib/social-graph'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: groupId } = await params

    const { data: member } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'Not a group member' }, { status: 403 })

    const admin = createAdminClient()
    const threadId = await ensureGroupChatThread(admin, groupId)
    await syncGroupChatMembers(admin, groupId, threadId)

    return NextResponse.json({ thread_id: threadId })
  } catch (err) {
    console.error('GET /api/groups/.../chat:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
