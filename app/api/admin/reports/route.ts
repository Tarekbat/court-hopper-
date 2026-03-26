import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/api-admin'

const patchSchema = z.object({
  report_id: z.string().uuid(),
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']),
  resolution_note: z.string().max(1000).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('moderation_reports')
    .select('id, reporter_id, target_kind, target_id, reason, details, status, reviewed_by, reviewed_at, resolution_note, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { error } = await admin
    .from('moderation_reports')
    .update({
      status: parsed.data.status,
      resolution_note: parsed.data.resolution_note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.report_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
