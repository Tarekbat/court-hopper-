import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/** Home-screen activity stream: in-app notifications + lightweight shape for UI. */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(40, Math.max(1, Number(searchParams.get('limit')) || 20))

    const { data: rows, error } = await supabase
      .from('notifications')
      .select('id, category, type, title, body, link_url, metadata, read_at, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const items = (rows ?? []).map((n) => ({
      id: n.id,
      category: n.category,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link_url,
      read: !!n.read_at,
      created_at: n.created_at,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET /api/activity:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
