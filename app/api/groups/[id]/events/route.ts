import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  scheduled_at: z.string().datetime(),
  location: z.string().max(200).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { id: groupId } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: events, error } = await supabase
      .from('group_events')
      .select('id, title, scheduled_at, location, court_booking_id, created_by, created_at')
      .eq('group_id', groupId)
      .order('scheduled_at', { ascending: true })

    if (error) {
      console.error('Error fetching group events:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(events ?? [])
  } catch (err) {
    console.error('Error in GET /api/groups/[id]/events:', err)
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
    const { data: { session } } = await supabase.auth.getSession()
    const { id: groupId } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { title, scheduled_at, location } = parsed.data

    const { data: event, error } = await supabase
      .from('group_events')
      .insert({
        group_id: groupId,
        title,
        scheduled_at,
        location: location ?? null,
        created_by: session.user.id,
      })
      .select('id, title, scheduled_at, location, created_by, created_at')
      .single()

    if (error) {
      console.error('Error creating group event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(event)
  } catch (err) {
    console.error('Error in POST /api/groups/[id]/events:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
