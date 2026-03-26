import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const createSchema = z.object({
  user_id: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_blocks')
    .select('id, blocker_id, blocked_id, created_at')
    .eq('blocker_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ blocks: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  if (parsed.data.user_id === session.user.id) {
    return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
  }

  const { error } = await supabase.from('user_blocks').upsert({
    blocker_id: session.user.id,
    blocked_id: parsed.data.user_id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
