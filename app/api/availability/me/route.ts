import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type Slot = { weekday: number; day_part: 'morning' | 'afternoon' | 'evening' }

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('user_availability_slots')
      .select('weekday, day_part')
      .eq('user_id', session.user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const slots = (data ?? []).map((s: any) => ({ weekday: s.weekday, day_part: s.day_part })) as Slot[]
    return NextResponse.json({ slots })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const slots = Array.isArray(body?.slots) ? (body.slots as any[]) : []

    const cleaned: Slot[] = slots
      .map((s) => ({
        weekday: Number(s?.weekday),
        day_part: String(s?.day_part),
      }))
      .filter((s) => Number.isInteger(s.weekday) && s.weekday >= 0 && s.weekday <= 6)
      .filter((s) => s.day_part === 'morning' || s.day_part === 'afternoon' || s.day_part === 'evening') as Slot[]

    // Replace strategy: delete then insert
    const del = await supabase
      .from('user_availability_slots')
      .delete()
      .eq('user_id', session.user.id)
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })

    if (cleaned.length > 0) {
      const ins = await supabase
        .from('user_availability_slots')
        .insert(cleaned.map((s) => ({ user_id: session.user.id, weekday: s.weekday, day_part: s.day_part })))
      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, slots: cleaned })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

