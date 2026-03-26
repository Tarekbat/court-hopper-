import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const schema = z.object({
  message: z.string().min(5).max(2000),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { error } = await supabase.from('moderation_reports').insert({
      reporter_id: session.user.id,
      target_kind: 'group_name',
      target_id: 'app_feedback',
      reason: 'feedback',
      details: parsed.data.message.trim(),
      status: 'open',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/feedback:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
