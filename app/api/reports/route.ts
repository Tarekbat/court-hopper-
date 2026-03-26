import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const schema = z.object({
  target_kind: z.enum(['user', 'message', 'group_post', 'group_name']),
  target_id: z.string().min(1),
  reason: z.string().min(3).max(200),
  details: z.string().max(2000).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { error } = await supabase.from('moderation_reports').insert({
    reporter_id: session.user.id,
    target_kind: parsed.data.target_kind,
    target_id: parsed.data.target_id,
    reason: parsed.data.reason.trim(),
    details: parsed.data.details?.trim() ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
