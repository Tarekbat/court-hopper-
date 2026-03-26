import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(session.user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/account/delete:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
