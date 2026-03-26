import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getBlockedUserIds } from '@/lib/moderation'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    const blockedIds = await getBlockedUserIds(supabase as any, session.user.id)

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, image')
      .neq('id', session.user.id)
      .eq('profile_is_public', true)
      .ilike('name', `%${q}%`)
      .limit(8)

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json((users ?? []).filter((u: { id: string }) => !blockedIds.has(u.id)))
  } catch (err) {
    console.error('Error in GET /api/users/search:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
