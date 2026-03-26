import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/api-admin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const limitParam = searchParams.get('limit')
    const cursor = searchParams.get('cursor') // created_at cursor

    const limit = Math.min(Math.max(Number(limitParam || 20), 1), 50)

    const admin = createAdminClient()
    let query = admin
      .from('users')
      .select('id, name, email, image, is_admin, created_at, city, phone_number')
      .order('created_at', { ascending: false })

    if (q && q.length >= 2) {
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%`)
    }
    if (cursor) query = query.lt('created_at', cursor)

    const { data, error } = await query.limit(limit)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const items = (data ?? []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      is_admin: u.is_admin === true,
      created_at: u.created_at,
      city: u.city ?? null,
      phone_number: u.phone_number ?? null,
    }))

    const nextCursor = items.length > 0 ? items[items.length - 1]!.created_at : null
    return NextResponse.json({ items, nextCursor, limit })
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

