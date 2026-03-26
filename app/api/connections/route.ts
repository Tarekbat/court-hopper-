import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { notifyUser } from '@/lib/push-notification'

const createSchema = z.object({
  to_user_id: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const me = session.user.id
    const { data, error } = await supabase
      .from('player_connections')
      .select('id, requester_id, recipient_id, status, acted_by, acted_at, created_at, updated_at')
      .or(`requester_id.eq.${me},recipient_id.eq.${me}`)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []
    const userIds = Array.from(
      new Set(
        rows.flatMap((r: any) => [r.requester_id, r.recipient_id]).filter(Boolean)
      )
    )
    let userMap: Record<string, { id: string; name: string | null; image: string | null }> = {}
    if (userIds.length) {
      const { data: users } = await supabase.from('users').select('id, name, image').in('id', userIds)
      users?.forEach((u: any) => {
        userMap[u.id] = { id: u.id, name: u.name ?? null, image: u.image ?? null }
      })
    }

    const shaped = rows.map((r: any) => ({
      ...r,
      requester: userMap[r.requester_id] ?? null,
      recipient: userMap[r.recipient_id] ?? null,
    }))

    return NextResponse.json({ connections: shaped })
  } catch (err) {
    console.error('GET /api/connections:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const me = session.user.id
    const to = parsed.data.to_user_id
    if (to === me) return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 })

    const { data: target } = await supabase.from('users').select('id').eq('id', to).maybeSingle()
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { data: existing } = await supabase
      .from('player_connections')
      .select('id, status, requester_id, recipient_id')
      .or(
        `and(requester_id.eq.${me},recipient_id.eq.${to}),and(requester_id.eq.${to},recipient_id.eq.${me})`
      )
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Connection already ${existing.status}` },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('player_connections')
      .insert({ requester_id: me, recipient_id: to, status: 'pending' })
      .select('id, requester_id, recipient_id, status, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Connection already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      const admin = createAdminClient()
      const { data: meUser } = await admin.from('users').select('name').eq('id', me).maybeSingle()
      await notifyUser(admin, {
        user_id: to,
        category: 'social',
        type: 'connection_request',
        title: `${meUser?.name || 'A player'} sent you a connection request`,
        body: 'Open notifications to accept or decline.',
        link_url: '/notifications',
        metadata: { connection_id: data.id, from_user_id: me },
      })
    } catch (e) {
      console.error('connection notify failed:', e)
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('POST /api/connections:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
