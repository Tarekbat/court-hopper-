import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

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
        updated_at: null,
      })
    }

    return NextResponse.json(settings || {
      id: 'app',
      hero_image_url: null,
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

    const body = await request.json()
    const { hero_image_url } = body

    const adminSupabase = createAdminClient()
    const { data: settings, error } = await adminSupabase
      .from('settings')
      .update({
        hero_image_url: hero_image_url || null,
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

