import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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
    const { status } = body

    if (status !== 'accepted' && status !== 'declined') {
      return NextResponse.json({ error: 'status must be accepted or declined' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('play_requests')
      .select('to_user_id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (existing.to_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Only the recipient can respond' }, { status: 403 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Request already responded' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('play_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating play request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in PATCH /api/play-requests/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
