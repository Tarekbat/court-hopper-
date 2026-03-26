import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

    const { id } = await params
    const me = session.user.id

    const { data: r, error } = await supabase
      .from('player_matches')
      .select(
        'id, player_a_id, player_b_id, sport_id, match_type, status, scheduled_at, location_label, score_jsonb, score_reported_by, score_confirmed_by'
      )
      .eq('id', id)
      .maybeSingle()

    if (error || !r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (r.player_a_id !== me && r.player_b_id !== me) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const otherId = r.player_a_id === me ? r.player_b_id : r.player_a_id
    const { data: u } = await supabase.from('users').select('name').eq('id', otherId).maybeSingle()
    const { data: s } = await supabase.from('sports').select('name, icon').eq('id', r.sport_id).maybeSingle()

    return NextResponse.json({
      id: r.id,
      opponent_name: u?.name ?? 'Opponent',
      sport_name: s?.name ?? 'Sport',
      sport_icon: s?.icon ?? null,
      match_type: r.match_type,
      status: r.status,
      scheduled_at: r.scheduled_at,
      location_label: r.location_label,
      score_jsonb: r.score_jsonb,
      score_reported_by: r.score_reported_by,
      score_confirmed_by: r.score_confirmed_by,
    })
  } catch (err) {
    console.error('GET /api/matches/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

const patchSchema = z.object({
  scheduled_at: z.string().datetime().optional().nullable(),
  location_label: z.string().max(300).optional().nullable(),
  court_id: z.string().optional().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'disputed', 'cancelled']).optional(),
  score_jsonb: z.any().optional().nullable(),
  confirm_score: z.boolean().optional(),
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
    const me = session.user.id

    const { data: row, error: fe } = await supabase
      .from('player_matches')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (fe || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (row.player_a_id !== me && row.player_b_id !== me) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    if (parsed.data.scheduled_at !== undefined) updates.scheduled_at = parsed.data.scheduled_at
    if (parsed.data.location_label !== undefined) updates.location_label = parsed.data.location_label
    if (parsed.data.court_id !== undefined) updates.court_id = parsed.data.court_id
    if (parsed.data.status !== undefined) updates.status = parsed.data.status

    if (parsed.data.score_jsonb !== undefined) {
      const existing = row.score_jsonb as Record<string, unknown> | null
      const nextScore = parsed.data.score_jsonb
      if (
        row.score_reported_by &&
        row.score_reported_by !== me &&
        nextScore != null &&
        JSON.stringify(nextScore) !== JSON.stringify(existing)
      ) {
        updates.status = 'disputed'
      }
      updates.score_jsonb = nextScore
      updates.score_reported_by = me
      updates.score_confirmed_by = null
    }

    if (parsed.data.confirm_score === true) {
      if (!row.score_reported_by || row.score_reported_by === me) {
        return NextResponse.json({ error: 'Nothing to confirm' }, { status: 400 })
      }
      updates.score_confirmed_by = me
      if (row.status !== 'disputed') updates.status = 'completed'
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates' }, { status: 400 })
    }

    const { data: out, error } = await supabase
      .from('player_matches')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(out)
  } catch (err) {
    console.error('PATCH /api/matches/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
