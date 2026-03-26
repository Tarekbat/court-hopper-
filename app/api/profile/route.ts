import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { hasProfanity } from '@/lib/moderation'

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone_number: z.string().optional().nullable(),
  image: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  profile_is_public: z.boolean().optional(),
  city: z.string().max(100).optional().nullable(),
  ntrp_rating: z.number().min(1.0).max(7.0).optional().nullable(),
  utr_rating: z.number().min(0).max(25).optional().nullable(),
  usta_membership_number: z.string().max(50).optional().nullable(),
  rating_source: z.string().max(50).optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile from public.users table.
    // Try to select optional columns, but handle gracefully if columns don't exist yet.
    let selectFields = 'id, name, email, image, created_at, updated_at'
    try {
      // Try with all optional columns first
      let user: any = null
      let error: any = null
      
      const result = await supabase
        .from('users')
        .select(`${selectFields}, phone_number, is_admin, profile_is_public, city, ntrp_rating, utr_rating, usta_membership_number, rating_verified, rating_source, last_active_at`)
        .eq('id', session.user.id)
        .single()

      user = result.data
      error = result.error

      // If error is about missing columns, try without them
      if (error && error.code === '42703') {
        if (error.message?.includes('city')) {
          const resultWithoutCity = await supabase
            .from('users')
            .select(`${selectFields}, phone_number, is_admin, profile_is_public, ntrp_rating, utr_rating, usta_membership_number, rating_verified, rating_source, last_active_at`)
            .eq('id', session.user.id)
            .single()
          if (resultWithoutCity.error) {
            console.error('Error fetching user profile:', resultWithoutCity.error)
            return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
          }
          const u = resultWithoutCity.data as any
          if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 })
          return NextResponse.json({
            id: u.id,
            name: u.name,
            email: u.email,
            phone_number: u.phone_number ?? null,
            image: u.image,
            is_admin: u.is_admin === true,
            profile_is_public: u.profile_is_public !== false,
            city: null,
            ntrp_rating: u.ntrp_rating ?? null,
            utr_rating: u.utr_rating ?? null,
            usta_membership_number: u.usta_membership_number ?? null,
            rating_verified: u.rating_verified === true,
            rating_source: u.rating_source ?? null,
            last_active_at: u.last_active_at ?? null,
            created_at: u.created_at,
            updated_at: u.updated_at,
          })
        }
        if (error.message?.includes('is_admin')) {
          const resultWithoutAdmin = await supabase
            .from('users')
            .select(`${selectFields}, phone_number, profile_is_public, city, ntrp_rating, utr_rating, usta_membership_number, rating_verified, rating_source, last_active_at`)
            .eq('id', session.user.id)
            .single()
          
          if (resultWithoutAdmin.error) {
            // If still error and it's about phone_number, try without both
            if (resultWithoutAdmin.error.code === '42703' && resultWithoutAdmin.error.message?.includes('phone_number')) {
              const resultBasic = await supabase
                .from('users')
                .select(selectFields)
                .eq('id', session.user.id)
                .single()
              
              if (resultBasic.error) {
                console.error('Error fetching user profile:', resultBasic.error)
                return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
              }

              const userBasic = resultBasic.data
              if (!userBasic) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
              }

              type UserProfile = {
                id: string
                name: string
                email: string
                image: string | null
                created_at: string
                updated_at: string
              }
              
              const userData = userBasic as unknown as UserProfile

              return NextResponse.json({
                id: userData.id,
                name: userData.name,
                email: userData.email,
                phone_number: null,
                image: userData.image,
                is_admin: false,
                profile_is_public: true,
                city: null,
                ntrp_rating: null,
                utr_rating: null,
                usta_membership_number: null,
                rating_verified: false,
                rating_source: null,
                last_active_at: null,
                created_at: userData.created_at,
                updated_at: userData.updated_at,
              })
            }
            
            console.error('Error fetching user profile:', resultWithoutAdmin.error)
            return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
          }

          user = resultWithoutAdmin.data
          error = resultWithoutAdmin.error
        } else if (error.message?.includes('phone_number')) {
          // Try without phone_number but with is_admin
          const resultWithoutPhone = await supabase
            .from('users')
            .select(`${selectFields}, is_admin, profile_is_public, city, ntrp_rating, utr_rating, usta_membership_number, rating_verified, rating_source, last_active_at`)
            .eq('id', session.user.id)
            .single()
          
          if (resultWithoutPhone.error) {
            // If still error and it's about is_admin, try without both
            if (resultWithoutPhone.error.code === '42703' && resultWithoutPhone.error.message?.includes('is_admin')) {
              const resultBasic = await supabase
                .from('users')
                .select(selectFields)
                .eq('id', session.user.id)
                .single()
              
              if (resultBasic.error) {
                console.error('Error fetching user profile:', resultBasic.error)
                return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
              }

              const userBasic = resultBasic.data
              if (!userBasic) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
              }

              type UserProfile = {
                id: string
                name: string
                email: string
                image: string | null
                created_at: string
                updated_at: string
              }
              
              const userData = userBasic as unknown as UserProfile

              return NextResponse.json({
                id: userData.id,
                name: userData.name,
                email: userData.email,
                phone_number: null,
                image: userData.image,
                is_admin: false,
                profile_is_public: true,
                city: null,
                ntrp_rating: null,
                utr_rating: null,
                usta_membership_number: null,
                rating_verified: false,
                rating_source: null,
                last_active_at: null,
                created_at: userData.created_at,
                updated_at: userData.updated_at,
              })
            }
            
            console.error('Error fetching user profile:', resultWithoutPhone.error)
            return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
          }

          user = resultWithoutPhone.data
          error = resultWithoutPhone.error
        } else {
          console.error('Error fetching user profile:', error)
          return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
        }
      }

      if (error) {
        console.error('Error fetching user profile:', error)
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
      }

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Type assertion to ensure TypeScript understands the structure
      type UserProfileWithOptionalFields = {
        id: string
        name: string
        email: string
        phone_number?: string | null
        image: string | null
        is_admin?: boolean | null
        profile_is_public?: boolean | null
        city?: string | null
        ntrp_rating?: number | null
        utr_rating?: number | null
        usta_membership_number?: string | null
        rating_verified?: boolean | null
        rating_source?: string | null
        last_active_at?: string | null
        created_at: string
        updated_at: string
      }
      
      const userData = user as unknown as UserProfileWithOptionalFields

      return NextResponse.json({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone_number: userData.phone_number ?? null,
        image: userData.image,
        is_admin: userData.is_admin === true,
        profile_is_public: userData.profile_is_public !== false,
        city: userData.city ?? null,
        ntrp_rating: (userData as any).ntrp_rating ?? null,
        utr_rating: (userData as any).utr_rating ?? null,
        usta_membership_number: (userData as any).usta_membership_number ?? null,
        rating_verified: (userData as any).rating_verified === true,
        rating_source: (userData as any).rating_source ?? null,
        last_active_at: (userData as any).last_active_at ?? null,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      })
    } catch (err) {
      console.error('Error in GET /api/profile:', err)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in GET /api/profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const validatedData = updateProfileSchema.parse(body)
    if (validatedData.name && hasProfanity(validatedData.name)) {
      return NextResponse.json({ error: 'Please remove inappropriate language.' }, { status: 400 })
    }

    // Update user profile in public.users table
    const updateData: any = {}
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    // Only include phone_number if the column exists (migration applied)
    if (validatedData.phone_number !== undefined) {
      // Check if phone_number column exists by trying to update it
      // If it fails, we'll skip it
      updateData.phone_number = validatedData.phone_number || null
    }
    if (validatedData.image !== undefined) {
      updateData.image = validatedData.image || null
    }
    if (validatedData.profile_is_public !== undefined) {
      updateData.profile_is_public = validatedData.profile_is_public
    }
    if (validatedData.city !== undefined) {
      updateData.city = validatedData.city || null
    }
    if (validatedData.ntrp_rating !== undefined) {
      updateData.ntrp_rating = validatedData.ntrp_rating ?? null
    }
    if (validatedData.utr_rating !== undefined) {
      updateData.utr_rating = validatedData.utr_rating ?? null
    }
    if (validatedData.usta_membership_number !== undefined) {
      updateData.usta_membership_number = validatedData.usta_membership_number || null
    }
    if (validatedData.rating_source !== undefined) {
      updateData.rating_source = validatedData.rating_source || null
    }
    // Update activity timestamp
    updateData.last_active_at = new Date().toISOString()

    // Try to update with phone_number first
    let updatedUser: any
    let error: any
    
    const updateResult = await supabase
      .from('users')
      .update(updateData)
      .eq('id', session.user.id)
      .select('id, name, email, phone_number, image, profile_is_public, city, ntrp_rating, utr_rating, usta_membership_number, rating_verified, rating_source, last_active_at, created_at, updated_at')
      .single()

    updatedUser = updateResult.data
    error = updateResult.error

    // If error is about missing phone_number column, retry without it
    if (error && error.code === '42703' && error.message?.includes('phone_number')) {
      const updateDataWithoutPhone = { ...updateData }
      delete updateDataWithoutPhone.phone_number
      
      const retryResult = await supabase
        .from('users')
        .update(updateDataWithoutPhone)
        .eq('id', session.user.id)
        .select('id, name, email, image, city, ntrp_rating, utr_rating, usta_membership_number, rating_verified, rating_source, last_active_at, created_at, updated_at')
        .single()
      
      updatedUser = retryResult.data
      error = retryResult.error
      
      // Add phone_number as null since column doesn't exist
      if (updatedUser) {
        updatedUser.phone_number = null
      }
    }

    // If error is about missing city column, retry without it
    if (error && error.code === '42703' && error.message?.includes('city')) {
      const updateDataWithoutCity = { ...updateData }
      delete updateDataWithoutCity.city
      const retryResult = await supabase
        .from('users')
        .update(updateDataWithoutCity)
        .eq('id', session.user.id)
        .select('id, name, email, phone_number, image, profile_is_public, ntrp_rating, utr_rating, usta_membership_number, rating_verified, rating_source, last_active_at, created_at, updated_at')
        .single()
      updatedUser = retryResult.data
      error = retryResult.error
      if (updatedUser) (updatedUser as any).city = null
    }

    // If rating columns don't exist yet, retry without them (keeps compatibility pre-migration)
    if (error && error.code === '42703' && error.message?.includes('ntrp_rating')) {
      const updateDataWithoutRatings = { ...updateData }
      delete updateDataWithoutRatings.ntrp_rating
      delete updateDataWithoutRatings.utr_rating
      delete updateDataWithoutRatings.usta_membership_number
      delete updateDataWithoutRatings.rating_source
      delete updateDataWithoutRatings.rating_verified
      delete updateDataWithoutRatings.last_active_at
      const retryResult = await supabase
        .from('users')
        .update(updateDataWithoutRatings)
        .eq('id', session.user.id)
        .select('id, name, email, phone_number, image, profile_is_public, city, created_at, updated_at')
        .single()
      updatedUser = retryResult.data
      error = retryResult.error
      if (updatedUser) {
        updatedUser.ntrp_rating = null
        updatedUser.utr_rating = null
        updatedUser.usta_membership_number = null
        updatedUser.rating_verified = false
        updatedUser.rating_source = null
        updatedUser.last_active_at = null
      }
    }

    if (error) {
      console.error('Error updating user profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Also update auth user metadata if name or image changed
    if (validatedData.name !== undefined || validatedData.image !== undefined) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          name: validatedData.name ?? updatedUser.name,
          avatar_url: validatedData.image ?? updatedUser.image,
        },
      })

      if (metadataError) {
        console.error('Error updating auth metadata:', metadataError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone_number: updatedUser.phone_number,
      image: updatedUser.image,
      profile_is_public: updatedUser.profile_is_public !== false,
      city: updatedUser.city ?? null,
      ntrp_rating: (updatedUser as any).ntrp_rating ?? null,
      utr_rating: (updatedUser as any).utr_rating ?? null,
      usta_membership_number: (updatedUser as any).usta_membership_number ?? null,
      rating_verified: (updatedUser as any).rating_verified === true,
      rating_source: (updatedUser as any).rating_source ?? null,
      last_active_at: (updatedUser as any).last_active_at ?? null,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error in PUT /api/profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

