import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id: tournamentId } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, organizer_id, status')
      .eq('id', tournamentId)
      .single()

    if (!tournament || tournament.organizer_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (tournament.status !== 'registration_closed' && tournament.status !== 'live') {
      return NextResponse.json({ error: 'Close registration first, then generate bracket' }, { status: 400 })
    }

    const { data: divisions } = await supabase
      .from('tournament_divisions')
      .select('id, name')
      .eq('tournament_id', tournamentId)

    for (const div of divisions ?? []) {
      const { data: existing } = await supabase
        .from('brackets')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('division_id', div.id)
        .single()

      if (existing) continue

      const { data: regs } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('division_id', div.id)
        .eq('status', 'confirmed')
        .order('seed', { ascending: true, nullsFirst: false })
        .order('registered_at', { ascending: true })

      const regIds = (regs ?? []).map((r: any) => r.id)
      const n = regIds.length
      if (n < 2) continue

      const { data: bracket, error: bracketError } = await supabase
        .from('brackets')
        .insert({ tournament_id: tournamentId, division_id: div.id })
        .select('id')
        .single()

      if (bracketError || !bracket) {
        console.error('Error creating bracket:', bracketError)
        return NextResponse.json({ error: 'Failed to create bracket' }, { status: 500 })
      }

      const size = nextPowerOf2(n)
      const byes = size - n
      const firstRoundMatches = size / 2
      let slot = 0
      const round1Matches: { match_order: number; player1_registration_id: string | null; player2_registration_id: string | null; status: string }[] = []

      for (let i = 0; i < firstRoundMatches; i++) {
        const p1 = regIds[slot] ?? null
        const p2 = regIds[slot + 1] ?? null
        slot += 2
        round1Matches.push({
          match_order: i,
          player1_registration_id: p1,
          player2_registration_id: p2,
          status: p1 && p2 ? 'pending' : 'bye',
        })
      }

      for (const m of round1Matches) {
        const { error: insertErr } = await supabase.from('bracket_matches').insert({
          bracket_id: bracket.id,
          round: 1,
          match_order: m.match_order,
          player1_registration_id: m.player1_registration_id,
          player2_registration_id: m.player2_registration_id,
          status: m.status,
        })
        if (insertErr) {
          console.error('Error inserting match:', insertErr)
          return NextResponse.json({ error: 'Failed to create matches' }, { status: 500 })
        }
      }

      let rounds = 1
      let matchesInRound = firstRoundMatches / 2
      while (matchesInRound >= 1) {
        rounds++
        for (let i = 0; i < matchesInRound; i++) {
          const { error: insertErr } = await supabase.from('bracket_matches').insert({
            bracket_id: bracket.id,
            round: rounds,
            match_order: i,
            player1_registration_id: null,
            player2_registration_id: null,
            status: 'pending',
          })
          if (insertErr) {
            console.error('Error inserting match:', insertErr)
            return NextResponse.json({ error: 'Failed to create matches' }, { status: 500 })
          }
        }
        matchesInRound = Math.floor(matchesInRound / 2)
      }
    }

    await supabase
      .from('tournaments')
      .update({ status: 'live' })
      .eq('id', tournamentId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error in POST generate-bracket:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
