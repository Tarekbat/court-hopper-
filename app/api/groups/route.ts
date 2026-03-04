import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createGroupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  sport_id: z.string().uuid(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  is_public: z.boolean().optional().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { searchParams } = new URL(request.url)
    const sportId = searchParams.get('sport_id')
    const myGroups = searchParams.get('my') === 'true'
    const city = searchParams.get('city')?.trim()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (myGroups) {
      const [membersResult, createdByMeResult] = await Promise.all([
        supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', session.user.id),
        supabase
          .from('groups')
          .select('id')
          .eq('created_by', session.user.id),
      ])
      const groupIds = (membersResult.data ?? []).map((m: any) => m.group_id)
      const createdByMe = createdByMeResult.data ?? []
      const allMyIds = [...new Set([...groupIds, ...createdByMe.map((g: any) => g.id)])]
      if (allMyIds.length === 0) {
        return NextResponse.json([])
      }
      const { data: groups, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          city,
          region,
          is_public,
          created_at,
          sport_id,
          sports ( id, slug, name, icon ),
          created_by,
          group_members ( user_id, role )
        `)
        .in('id', allMyIds)
        .order('created_at', { ascending: false })
      if (sportId) {
        // filter in memory if needed
      }
      if (error) {
        console.error('Error fetching my groups:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      const creatorIds = [...new Set((groups ?? []).map((g: any) => g.created_by).filter(Boolean))]
      let creatorsMap: Record<string, { id: string; name: string | null; image: string | null }> = {}
      if (creatorIds.length > 0) {
        const { data: creatorRows } = await supabase
          .from('users')
          .select('id, name, image')
          .in('id', creatorIds)
        creatorRows?.forEach((u: any) => {
          creatorsMap[u.id] = { id: u.id, name: u.name ?? null, image: u.image ?? null }
        })
      }
      const list = (groups ?? []).map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        city: g.city,
        region: g.region,
        is_public: g.is_public,
        created_at: g.created_at,
        sport_id: g.sport_id,
        sport: g.sports ? { id: g.sports.id, slug: g.sports.slug, name: g.sports.name, icon: g.sports.icon } : null,
        created_by: g.created_by,
        creator: creatorsMap[g.created_by] ?? null,
        member_count: Array.isArray(g.group_members) ? g.group_members.length : 0,
        is_member: true,
        is_creator: g.created_by === session.user.id,
      }))
      const filtered = sportId ? list.filter((g: any) => g.sport_id === sportId) : list
      return NextResponse.json(filtered)
    }

    let query = supabase
      .from('groups')
      .select(`
        id,
        name,
        description,
        city,
        region,
        is_public,
        created_at,
        sport_id,
        sports ( id, slug, name, icon ),
        created_by,
        group_members ( user_id, role )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (sportId) {
      query = query.eq('sport_id', sportId)
    }
    if (city) {
      query = query.ilike('city', `%${city}%`)
    }

    const { data: groups, error } = await query

    if (error) {
      console.error('Error fetching groups:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const creatorIds = [...new Set((groups ?? []).map((g: any) => g.created_by).filter(Boolean))]
    let creatorsMap: Record<string, { id: string; name: string | null; image: string | null }> = {}
    if (creatorIds.length > 0) {
      const { data: creatorRows } = await supabase
        .from('users')
        .select('id, name, image')
        .in('id', creatorIds)
      creatorRows?.forEach((u: any) => {
        creatorsMap[u.id] = { id: u.id, name: u.name ?? null, image: u.image ?? null }
      })
    }

    const list = (groups ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      city: g.city,
      region: g.region,
      is_public: g.is_public,
      created_at: g.created_at,
      sport_id: g.sport_id,
      sport: g.sports ? { id: g.sports.id, slug: g.sports.slug, name: g.sports.name, icon: g.sports.icon } : null,
      created_by: g.created_by,
      creator: creatorsMap[g.created_by] ?? null,
      member_count: Array.isArray(g.group_members) ? g.group_members.length : 0,
      is_member: Array.isArray(g.group_members)
        ? g.group_members.some((m: any) => m.user_id === session.user.id)
        : false,
      is_creator: g.created_by === session.user.id,
    }))

    return NextResponse.json(list)
  } catch (err) {
    console.error('Error in GET /api/groups:', err)
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
    const parsed = createGroupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, description, sport_id, city, region, is_public } = parsed.data
    const userId = session.user.id

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description: description ?? null,
        sport_id,
        created_by: userId,
        city: city ?? null,
        region: region ?? null,
        is_public,
      })
      .select('id, name, description, sport_id, city, region, is_public, created_by, created_at')
      .single()

    if (groupError || !group) {
      console.error('Error creating group:', groupError)
      return NextResponse.json({ error: groupError?.message ?? 'Failed to create group' }, { status: 500 })
    }

    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'admin',
    })

    if (memberError) {
      console.error('Error adding creator as member:', memberError)
      await supabase.from('groups').delete().eq('id', group.id)
      return NextResponse.json({ error: 'Failed to set up group' }, { status: 500 })
    }

    return NextResponse.json(group)
  } catch (err) {
    console.error('Error in POST /api/groups:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
