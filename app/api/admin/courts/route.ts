import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/api-admin'
import { randomUUID } from 'crypto'

const courtCreateSchema = z.object({
  // Core
  name: z.string().min(2).max(200),
  address: z.string().min(3).max(300),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zip_code: z.string().min(3).max(15),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  distance: z.number().nullable().optional(),

  // Pricing / inventory
  total_courts: z.number().int().min(1).max(1000),
  surface: z.string().min(1).max(100),
  peak_price: z.number().min(0).max(100000),
  off_peak_price: z.number().min(0).max(100000),
  rating: z.number().min(0).max(10).optional(),
  review_count: z.number().int().min(0).optional(),

  // Cost model
  cost_type: z
    .enum(['free', 'pay_per_hour', 'membership_required'])
    .optional(),
  cost_notes: z.string().max(2000).optional().nullable(),

  // Content
  description: z.string().max(4000).default(''),
  amenities: z.array(z.string()).default([]),
  available_days: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),

  // Admin-only scheduling + metadata
  status: z.enum(['active', 'temporarily_closed', 'permanently_closed']).optional(),
  phone_number: z.string().optional().nullable(),
  website_url: z.string().url().optional().nullable(),
  reservation_required: z.boolean().optional().default(false),
  reservation_link: z.string().url().optional().nullable(),
  special_instructions: z.string().max(2000).optional().nullable(),
  hours_24_7: z.boolean().optional().default(false),
  hours_by_day: z.record(z.any()).optional(),
  surfaces: z.array(z.string()).optional(),
})

function truncateImages(images: any, max = 5) {
  if (!Array.isArray(images)) return []
  return images.filter((x) => typeof x === 'string' && x.trim().length > 0).slice(0, max)
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const limitParam = searchParams.get('limit')
    const cursor = searchParams.get('cursor') // created_at cursor (ISO)
    const status = searchParams.get('status') || undefined

    const limit = Math.min(Math.max(Number(limitParam || 20), 1), 50)

    const admin = createAdminClient()
    let query = admin
      .from('courts')
      .select('id, name, city, state, surface, total_courts, peak_price, off_peak_price, cost_type, rating, review_count, status, created_at, images, available_days')

    if (q && q.length >= 2) {
      query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`)
    }
    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })
    if (cursor) query = query.lt('created_at', cursor)

    const { data, error } = await query.limit(limit)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const items = (data ?? []).map((c: any) => {
      const preview = truncateImages(c.images, 5)
      return {
        id: c.id,
        name: c.name,
        city: c.city,
        state: c.state,
        surface: c.surface,
        total_courts: c.total_courts,
        peak_price: c.peak_price,
        off_peak_price: c.off_peak_price,
        rating: c.rating,
        review_count: c.review_count,
        status: c.status,
        created_at: c.created_at,
        primary_image: preview[0] ?? null,
        images_preview: preview,
        available_days: Array.isArray(c.available_days) ? c.available_days : [],
        cost_type: c.cost_type ?? 'pay_per_hour',
      }
    })

    const nextCursor = items.length > 0 ? items[items.length - 1]!.created_at : null

    return NextResponse.json({ items, nextCursor, limit })
  } catch (error) {
    console.error('Error in GET /api/admin/courts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const parsed = courtCreateSchema.parse(body)

    const admin = createAdminClient()
    const id = randomUUID()

    const insertPayload: any = {
      id,
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
      rating: parsed.rating ?? 0,
      review_count: parsed.review_count ?? 0,

      cost_type: parsed.cost_type ?? 'pay_per_hour',
      cost_notes: parsed.cost_notes ?? null,
      description: parsed.description,
      amenities: parsed.amenities,
      available_days: parsed.available_days,
      images: parsed.images,
      status: parsed.status ?? 'active',
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
      .insert(insertPayload)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create court' }, { status: 500 })
    }

    return NextResponse.json({ court: data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error in POST /api/admin/courts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

