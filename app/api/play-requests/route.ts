import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { notifyUser } from '@/lib/push-notification'
import { z } from 'zod'
import { isBlockedEitherWay } from '@/lib/moderation'
import { sendEmail } from '@/lib/email'

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
        sports ( id, slug, name, icon ),
        from_user:users!play_requests_from_user_id_fkey ( id, name, image ),
        to_user:users!play_requests_to_user_id_fkey ( id, name, image )
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
      from_name: r.from_user?.name ?? null,
      from_image: r.from_user?.image ?? null,
      to_name: r.to_user?.name ?? null,
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
    if (await isBlockedEitherWay(supabase as any, session.user.id, to_user_id)) {
      return NextResponse.json({ error: 'Cannot send request to this user' }, { status: 403 })
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

    try {
      const admin = createAdminClient()
      const { data: fromUser } = await admin.from('users').select('name').eq('id', session.user.id).maybeSingle()
      const fromName = fromUser?.name || 'A player'
      await notifyUser(admin, {
        user_id: to_user_id,
        category: 'matches',
        type: 'play_request',
        title: `${fromName} wants to play`,
        body: message?.trim() || 'Open notifications to accept or decline.',
        link_url: '/notifications',
        metadata: { from_user_id: session.user.id, play_request_id: data.id },
      })
      const { data: toUser } = await admin.from('users').select('email').eq('id', to_user_id).maybeSingle()
      if (toUser?.email) {
        await sendEmail({
          to: toUser.email,
          subject: `${fromName} sent you a match request`,
          html: `<p>${fromName} wants to play.</p><p>Open your notifications to accept or decline.</p>`,
        })
      }
    } catch (e) {
      console.error('play_request notify:', e)
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
