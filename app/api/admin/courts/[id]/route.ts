import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/api-admin'

const courtUpdateSchema = z.object({
  name: z.string().min(2).max(200),
  address: z.string().min(3).max(300),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zip_code: z.string().min(3).max(15),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  distance: z.number().nullable().optional(),

  total_courts: z.number().int().min(1).max(1000),
  surface: z.string().min(1).max(100),
  peak_price: z.number().min(0).max(100000),
  off_peak_price: z.number().min(0).max(100000),
  cost_type: z
    .enum(['free', 'pay_per_hour', 'membership_required'])
    .optional(),
  cost_notes: z.string().max(2000).optional().nullable(),

  description: z.string().max(4000).default(''),
  amenities: z.array(z.string()).default([]),
  available_days: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),

  status: z.enum(['active', 'temporarily_closed', 'permanently_closed']).default('active'),
  phone_number: z.string().optional().nullable(),
  website_url: z.string().url().optional().nullable(),
  reservation_required: z.boolean().optional().default(false),
  reservation_link: z.string().url().optional().nullable(),
  special_instructions: z.string().max(2000).optional().nullable(),
  hours_24_7: z.boolean().optional().default(false),
  hours_by_day: z.record(z.any()).optional(),
  surfaces: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = params
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('courts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Court not found' }, { status: 404 })
    }

    return NextResponse.json({ court: data })
  } catch (error) {
    console.error('Error in GET /api/admin/courts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const parsed = courtUpdateSchema.parse(body)

    const admin = createAdminClient()
    const { id } = params
    const updatePayload: any = {
      name: parsed.name,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      zip_code: parsed.zip_code,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      distance: parsed.distance ?? null,
      total_courts: parsed.total_courts,
      surface: parsed.surface,
      peak_price: parsed.peak_price,
      off_peak_price: parsed.off_peak_price,

      cost_type: parsed.cost_type ?? 'pay_per_hour',
      cost_notes: parsed.cost_notes ?? null,
      description: parsed.description,
      amenities: parsed.amenities,
      available_days: parsed.available_days,
      images: parsed.images,
      status: parsed.status,
      phone_number: parsed.phone_number ?? null,
      website_url: parsed.website_url ?? null,
      reservation_required: parsed.reservation_required ?? false,
      reservation_link: parsed.reservation_link ?? null,
      special_instructions: parsed.special_instructions ?? null,
      hours_24_7: parsed.hours_24_7 ?? false,
      hours_by_day: parsed.hours_by_day ?? {},
      surfaces: parsed.surfaces ?? [],
    }

    const { data, error } = await admin
      .from('courts')
      .update(updatePayload)
      .eq('id', params.id)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Failed to update court' }, { status: 500 })
    }

    return NextResponse.json({ court: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error in PUT /api/admin/courts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const admin = createAdminClient()
    const { id } = params

    // Soft-delete approach for data preservation: mark permanently closed instead of deleting rows.
    const { data, error } = await admin
      .from('courts')
      .update({ status: 'permanently_closed' })
      .eq('id', id)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Court not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, court: data })
  } catch (error) {
    console.error('Error in DELETE /api/admin/courts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

