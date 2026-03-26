import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const me = session.user.id

    const { data: rows, error } = await supabase
      .from('player_matches')
      .select(
        `
        id,
        play_request_id,
        player_a_id,
        player_b_id,
        sport_id,
        match_type,
        status,
        scheduled_at,
        location_label,
        court_id,
        score_jsonb,
        score_reported_by,
        score_confirmed_by,
        created_at,
        updated_at
      `
      )
      .or(`player_a_id.eq.${me},player_b_id.eq.${me}`)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const otherIds = Array.from(
      new Set(
        (rows ?? []).flatMap((r: any) =>
          [r.player_a_id, r.player_b_id].filter((id: string) => id && id !== me)
        )
      )
    )
    const sportIds = Array.from(new Set((rows ?? []).map((r: any) => r.sport_id).filter(Boolean)))

    let nameMap: Record<string, string | null> = {}
    if (otherIds.length) {
      const { data: users } = await supabase.from('users').select('id, name').in('id', otherIds)
      users?.forEach((u: { id: string; name: string | null }) => {
        nameMap[u.id] = u.name
      })
    }

    let sportMap: Record<string, { id: string; name: string; icon: string | null }> = {}
    if (sportIds.length) {
      const { data: sports } = await supabase.from('sports').select('id, name, icon').in('id', sportIds)
      sports?.forEach((s: { id: string; name: string; icon: string | null }) => {
        sportMap[s.id] = { id: s.id, name: s.name, icon: s.icon }
      })
    }

    const matches = (rows ?? []).map((r: any) => {
      const otherId = r.player_a_id === me ? r.player_b_id : r.player_a_id
      return {
        id: r.id,
        play_request_id: r.play_request_id,
        opponent_id: otherId,
        opponent_name: nameMap[otherId] ?? null,
        sport: sportMap[r.sport_id] ?? null,
        match_type: r.match_type,
        status: r.status,
        scheduled_at: r.scheduled_at,
        location_label: r.location_label,
        court_id: r.court_id,
        score_jsonb: r.score_jsonb,
        score_reported_by: r.score_reported_by,
        score_confirmed_by: r.score_confirmed_by,
        i_am_player_a: r.player_a_id === me,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }
    })

    return NextResponse.json({ matches })
  } catch (err) {
    console.error('GET /api/matches:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
