import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/auth'

// Upload images for a court
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(session.user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Validate files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const maxSize = 10 * 1024 * 1024 // 10MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Only JPEG, PNG, WebP, and GIF are allowed.` },
          { status: 400 }
        )
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 10MB.` },
          { status: 400 }
        )
      }
    }

    // Upload all files
    const uploadedUrls: string[] = []

    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${params.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('court-images')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Error uploading file:', uploadError)
        continue // Skip failed uploads
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('court-images').getPublicUrl(fileName)

      uploadedUrls.push(publicUrl)
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 })
    }

    // Update court images in database
    const adminSupabase = createAdminClient()
    const { data: court } = await adminSupabase
      .from('courts')
      .select('images')
      .eq('id', params.id)
      .single()

    if (!court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    }

    // Merge new images with existing ones
    const existingImages = Array.isArray(court.images) ? court.images : []
    const updatedImages = [...existingImages, ...uploadedUrls]

    const { error: updateError } = await adminSupabase
      .from('courts')
      .update({ images: updatedImages })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating court images:', updateError)
      return NextResponse.json({ error: 'Failed to update court images' }, { status: 500 })
    }

    return NextResponse.json({
      urls: uploadedUrls,
      message: `Successfully uploaded ${uploadedUrls.length} image(s)`,
    })
  } catch (error) {
    console.error('Error in POST /api/courts/[id]/images:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Set an image as the main photo (move to first position)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(session.user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Get current court images
    const adminSupabase = createAdminClient()
    const { data: court } = await adminSupabase
      .from('courts')
      .select('images')
      .eq('id', params.id)
      .single()

    if (!court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    }

    const existingImages = Array.isArray(court.images) ? court.images : []
    
    // Check if image exists in the array
    const imageIndex = existingImages.indexOf(imageUrl)
    if (imageIndex === -1) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // If already first, no need to update
    if (imageIndex === 0) {
      return NextResponse.json({ message: 'Image is already the main photo' })
    }

    // Reorder: move selected image to first position
    const updatedImages = [
      imageUrl,
      ...existingImages.filter((img: string) => img !== imageUrl)
    ]

    const { error: updateError } = await adminSupabase
      .from('courts')
      .update({ images: updatedImages })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating court images:', updateError)
      return NextResponse.json({ error: 'Failed to update court images' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Main photo updated successfully',
      images: updatedImages
    })
  } catch (error) {
    console.error('Error in PUT /api/courts/[id]/images:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete an image from a court
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(session.user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Extract file path from URL
    const urlParts = imageUrl.split('/')
    const fileName = urlParts.slice(-2).join('/') // Get courtId/filename

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('court-images')
      .remove([fileName])

    if (deleteError) {
      console.error('Error deleting file:', deleteError)
      // Continue to remove from database even if storage delete fails
    }

    // Remove from court images array
    const adminSupabase = createAdminClient()
    const { data: court } = await adminSupabase
      .from('courts')
      .select('images')
      .eq('id', params.id)
      .single()

    if (!court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    }

    const existingImages = Array.isArray(court.images) ? court.images : []
    const updatedImages = existingImages.filter((img: string) => img !== imageUrl)

    const { error: updateError } = await adminSupabase
      .from('courts')
      .update({ images: updatedImages })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating court images:', updateError)
      return NextResponse.json({ error: 'Failed to update court images' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Image deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/courts/[id]/images:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

