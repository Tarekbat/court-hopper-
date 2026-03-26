import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type BoardRow = {
  user_id: string
  name: string | null
  image: string | null
  completed_matches: number
}

/** Lightweight leaderboard scaffold for group momentum. */
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
    const me = session.user.id

    const { data: meMember } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', me)
      .maybeSingle()
    if (!meMember) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const { data: members, error: memErr } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 })
    const memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
    if (memberIds.length === 0) return NextResponse.json({ leaderboard: [] })

    const { data: matches, error: matchErr } = await supabase
      .from('player_matches')
      .select('player_a_id, player_b_id, status')
      .eq('status', 'completed')
      .in('player_a_id', memberIds)
      .in('player_b_id', memberIds)
      .limit(1000)
    if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 })

    const counts = new Map<string, number>()
    for (const uid of memberIds) counts.set(uid, 0)
    for (const m of matches ?? []) {
      counts.set(m.player_a_id, (counts.get(m.player_a_id) ?? 0) + 1)
      counts.set(m.player_b_id, (counts.get(m.player_b_id) ?? 0) + 1)
    }

    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, name, image')
      .in('id', memberIds)
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))

    const leaderboard: BoardRow[] = memberIds.map((uid) => ({
      user_id: uid,
      name: userMap.get(uid)?.name ?? null,
      image: userMap.get(uid)?.image ?? null,
      completed_matches: counts.get(uid) ?? 0,
    }))

    leaderboard.sort((a, b) => b.completed_matches - a.completed_matches)

    return NextResponse.json({
      leaderboard: leaderboard.slice(0, 20),
      total_completed_matches: (matches ?? []).length,
    })
  } catch (err) {
    console.error('GET /api/groups/[id]/leaderboard:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
