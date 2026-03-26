import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        description,
        city,
        region,
        is_public,
        created_at,
        updated_at,
        sport_id,
        sports ( id, slug, name, icon ),
        created_by,
        creator:users!groups_created_by_fkey ( id, name, image )
      `)
      .eq('id', id)
      .single()

    if (error || !group) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      console.error('Error fetching group:', error)
      return NextResponse.json({ error: error?.message ?? 'Failed to fetch group' }, { status: 500 })
    }

    const groupData = group as any
    const sportId = groupData.sport_id
    const nowIso = new Date().toISOString()

    const [membersResult, eventsResult] = await Promise.all([
      supabase
        .from('group_members')
        .select('user_id, role, joined_at, users ( id, name, image )')
        .eq('group_id', id),
      supabase
        .from('group_events')
        .select('id, title, scheduled_at, location, max_capacity, created_by, created_at')
        .eq('group_id', id)
        .gte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true })
        .limit(20),
    ])

    const members = membersResult.data ?? []
    const events = eventsResult.data ?? []
    const memberUserIds = members.map((m: any) => m.user_id).filter(Boolean)
    let skillLevelMap: Record<string, number> = {}
    if (sportId && memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('play_partner_profiles')
        .select('user_id, skill_level')
        .eq('sport_id', sportId)
        .in('user_id', memberUserIds)
      profiles?.forEach((p: any) => {
        skillLevelMap[p.user_id] = p.skill_level
      })
    }

    const creatorFromJoin = groupData.creator
    const creator: { id: string; name: string | null; image: string | null } | null = creatorFromJoin
      ? {
          id: creatorFromJoin.id,
          name: creatorFromJoin.name ?? null,
          image: creatorFromJoin.image ?? null,
        }
      : null

    const currentUserId = session.user.id
    const myMembership = members.find((m: any) => m.user_id === currentUserId)

    return NextResponse.json({
      ...group,
      viewer_id: currentUserId,
      sport: (group as any).sports
        ? {
            id: (group as any).sports.id,
            slug: (group as any).sports.slug,
            name: (group as any).sports.name,
            icon: (group as any).sports.icon,
          }
        : null,
      creator,
      members: members.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        name: m.users?.name ?? null,
        image: m.users?.image ?? null,
        skill_level: skillLevelMap[m.user_id] ?? null,
      })),
      upcoming_events: events,
      member_count: members.length,
      is_member: !!myMembership,
      is_creator: (group as any).created_by === currentUserId,
      my_role: myMembership?.role ?? null,
    })
  } catch (err) {
    console.error('Error in GET /api/groups/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.city !== undefined) updates.city = body.city
    if (body.region !== undefined) updates.region = body.region
    if (body.is_public !== undefined) updates.is_public = body.is_public

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating group:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in PATCH /api/groups/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { id } = await params

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase.from('groups').delete().eq('id', id)

    if (error) {
      console.error('Error deleting group:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error in DELETE /api/groups/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
