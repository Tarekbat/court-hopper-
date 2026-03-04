import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createRequestSchema = z.object({
  to_user_id: z.string().min(1),
  sport_id: z.string().uuid(),
  message: z.string().max(500).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requests, error } = await supabase
      .from('play_requests')
      .select(`
        id,
        from_user_id,
        to_user_id,
        sport_id,
        message,
        status,
        created_at,
        sports ( id, slug, name, icon )
      `)
      .or(`from_user_id.eq.${session.user.id},to_user_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching play requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = (requests ?? []).map((r: any) => ({
      id: r.id,
      from_user_id: r.from_user_id,
      to_user_id: r.to_user_id,
      sport_id: r.sport_id,
      sport: r.sports ? { id: r.sports.id, slug: r.sports.slug, name: r.sports.name, icon: r.sports.icon } : null,
      message: r.message,
      status: r.status,
      created_at: r.created_at,
      is_from_me: r.from_user_id === session.user.id,
    }))

    return NextResponse.json(list)
  } catch (err) {
    console.error('Error in GET /api/play-requests:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { to_user_id, sport_id, message } = parsed.data

    if (to_user_id === session.user.id) {
      return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('play_requests')
      .insert({
        from_user_id: session.user.id,
        to_user_id,
        sport_id,
        message: message ?? null,
        status: 'pending',
      })
      .select('id, from_user_id, to_user_id, sport_id, message, status, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Request already sent' }, { status: 409 })
      }
      console.error('Error creating play request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in POST /api/play-requests:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
