import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('settings')
      .select('maintenance_mode, maintenance_message, app_version, feature_flags')
      .eq('id', 'app')
      .single()

    return NextResponse.json({
      maintenance_mode: data?.maintenance_mode === true,
      maintenance_message: data?.maintenance_message ?? null,
      app_version: data?.app_version ?? 'v1',
      feature_flags: (data?.feature_flags ?? {}) as Record<string, boolean>,
    })
  } catch (err) {
    console.error('GET /api/runtime-config failed', err)
    return NextResponse.json(
      { maintenance_mode: false, maintenance_message: null, app_version: 'v1', feature_flags: {} },
      { status: 200 }
    )
  }
}
