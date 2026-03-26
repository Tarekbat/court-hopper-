import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/auth'

// GET settings (public)
export async function GET() {
  try {
    // Use admin client to avoid RLS issues for public settings
    const supabase = createAdminClient()
    
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'app')
      .single()

    if (error) {
      console.error('Error fetching settings:', error)
      // Return default if settings don't exist
      return NextResponse.json({
        id: 'app',
        hero_image_url: null,
        feature_flags: {},
        maintenance_mode: false,
        maintenance_message: null,
        app_version: 'v1',
        updated_at: null,
      })
    }

    return NextResponse.json(settings || {
      id: 'app',
      hero_image_url: null,
      feature_flags: {},
      maintenance_mode: false,
      maintenance_message: null,
      app_version: 'v1',
      updated_at: null,
    })
  } catch (error) {
    console.error('Error in GET /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT settings (authenticated only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session.user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { hero_image_url, feature_flags, maintenance_mode, maintenance_message, app_version } = body

    const adminSupabase = createAdminClient()
    const { data: settings, error } = await adminSupabase
      .from('settings')
      .update({
        hero_image_url: hero_image_url || null,
        feature_flags: feature_flags ?? undefined,
        maintenance_mode: typeof maintenance_mode === 'boolean' ? maintenance_mode : undefined,
        maintenance_message: maintenance_message ?? undefined,
        app_version: app_version || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'app')
      .select()
      .single()

    if (error) {
      console.error('Error updating settings:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error in PUT /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

