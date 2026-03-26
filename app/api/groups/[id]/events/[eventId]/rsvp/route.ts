import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { rebalanceGroupEventRsvps, buildRsvpSummary, type RsvpStatus } from '@/lib/group-event-rsvp'

const putSchema = z.object({
  status: z.enum(['going', 'maybe', 'no']),
})

async function assertMember(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  groupId: string,
  userId: string
) {
  const { data } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const { id: groupId, eventId } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: ev, error: evErr } = await supabase
      .from('group_events')
      .select('id, group_id, max_capacity')
      .eq('id', eventId)
      .single()

    if (evErr || !ev || (ev as { group_id: string }).group_id !== groupId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!(await assertMember(supabase, groupId, session.user.id))) {
      return NextResponse.json({ error: 'Not a group member' }, { status: 403 })
    }

    const { data: rows, error } = await supabase
      .from('group_event_rsvps')
      .select('user_id, status, waitlist_position, created_at')
      .eq('event_id', eventId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = rows ?? []
    const counts = buildRsvpSummary(list as { user_id: string; status: string; waitlist_position: number | null }[])

    const userIds = list.map((r: { user_id: string }) => r.user_id)
    let usersMap: Record<string, { name: string | null; image: string | null }> = {}
    if (userIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, name, image').in('id', userIds)
      users?.forEach((u: { id: string; name: string | null; image: string | null }) => {
        usersMap[u.id] = { name: u.name ?? null, image: u.image ?? null }
      })
    }

    const my = list.find((r: { user_id: string }) => r.user_id === session.user.id) as
      | { user_id: string; status: string; waitlist_position: number | null }
      | undefined

    const going_faces = list
      .filter(
        (r: { status: string; waitlist_position: number | null }) =>
          r.status === 'going' && r.waitlist_position == null
      )
      .slice(0, 12)
      .map((r: { user_id: string }) => ({
        user_id: r.user_id,
        ...usersMap[r.user_id],
      }))

    const waitlist_faces = list
      .filter(
        (r: { status: string; waitlist_position: number | null }) =>
          r.status === 'going' && r.waitlist_position != null
      )
      .sort(
        (a: { waitlist_position: number | null }, b: { waitlist_position: number | null }) =>
          (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0)
      )
      .slice(0, 12)
      .map((r: { user_id: string; waitlist_position: number | null }) => ({
        user_id: r.user_id,
        waitlist_position: r.waitlist_position,
        ...usersMap[r.user_id],
      }))

    return NextResponse.json({
      max_capacity: (ev as { max_capacity: number | null }).max_capacity ?? null,
      counts,
      my: my
        ? {
            status: my.status as RsvpStatus,
            waitlist_position: my.waitlist_position,
            is_confirmed: my.status === 'going' && my.waitlist_position == null,
            is_waitlisted: my.status === 'going' && my.waitlist_position != null,
          }
        : null,
      going_faces,
      waitlist_faces,
    })
  } catch (err) {
    console.error('GET /api/groups/.../rsvp:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const { id: groupId, eventId } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { status } = parsed.data

    const { data: ev, error: evErr } = await supabase
      .from('group_events')
      .select('id, group_id, max_capacity')
      .eq('id', eventId)
      .single()

    if (evErr || !ev || (ev as { group_id: string }).group_id !== groupId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!(await assertMember(supabase, groupId, session.user.id))) {
      return NextResponse.json({ error: 'Not a group member' }, { status: 403 })
    }

    const maxCap = (ev as { max_capacity: number | null }).max_capacity ?? null
    const admin = createAdminClient()

    const { error: upErr } = await admin.from('group_event_rsvps').upsert(
      {
        event_id: eventId,
        user_id: session.user.id,
        status,
        waitlist_position: null,
      },
      { onConflict: 'event_id,user_id' }
    )

    if (upErr) {
      console.error('rsvp upsert:', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    await rebalanceGroupEventRsvps(admin, eventId, maxCap)

    const { data: rows } = await admin
      .from('group_event_rsvps')
      .select('user_id, status, waitlist_position')
      .eq('event_id', eventId)

    const list = rows ?? []
    const counts = buildRsvpSummary(list as { user_id: string; status: string; waitlist_position: number | null }[])
    const myRow = list.find((r: { user_id: string }) => r.user_id === session.user.id) as
      | { user_id: string; status: string; waitlist_position: number | null }
      | undefined

    return NextResponse.json({
      ok: true,
      max_capacity: maxCap,
      counts,
      my: myRow
        ? {
            status: myRow.status as RsvpStatus,
            waitlist_position: myRow.waitlist_position,
            is_confirmed: myRow.status === 'going' && myRow.waitlist_position == null,
            is_waitlisted: myRow.status === 'going' && myRow.waitlist_position != null,
          }
        : null,
    })
  } catch (err) {
    console.error('PUT /api/groups/.../rsvp:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
