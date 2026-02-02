import { createAdminClient } from '../lib/supabase-server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Script to upload a court image to Supabase Storage and add it to a court
 * 
 * Usage: 
 *   ts-node --project tsconfig.seed.json scripts/upload-court-image.ts <courtId>
 * 
 * Example:
 *   ts-node --project tsconfig.seed.json scripts/upload-court-image.ts 1
 */

async function uploadCourtImage(courtId: string) {
  try {
    const supabase = createAdminClient()
    
    // Read the image file
    const imagePath = join(process.cwd(), 'public', 'coral-gables.jpg')
    const imageBuffer = readFileSync(imagePath)
    
    // Generate unique filename
    const fileName = `${courtId}/${Date.now()}-coral-gables.jpg`
    
    console.log(`Uploading image to Supabase Storage...`)
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('court-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      throw uploadError
    }

    console.log('Image uploaded successfully!')

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('court-images').getPublicUrl(fileName)

    console.log(`Public URL: ${publicUrl}`)

    // Get current court images
    const { data: court, error: courtError } = await supabase
      .from('courts')
      .select('images')
      .eq('id', courtId)
      .single()

    if (courtError || !court) {
      console.error('Error fetching court:', courtError)
      throw new Error(`Court with ID ${courtId} not found`)
    }

    // Merge new image with existing ones
    const existingImages = Array.isArray(court.images) ? court.images : []
    const updatedImages = [publicUrl, ...existingImages] // Add as first image

    // Update court with new image
    const { error: updateError } = await supabase
      .from('courts')
      .update({ images: updatedImages })
      .eq('id', courtId)

    if (updateError) {
      console.error('Error updating court images:', updateError)
      throw updateError
    }

    console.log(`✅ Successfully added image to court ${courtId}!`)
    console.log(`Court now has ${updatedImages.length} image(s)`)
    
    return publicUrl
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

// Get court ID from command line argument
const courtId = process.argv[2]

if (!courtId) {
  console.error('Usage: ts-node --project tsconfig.seed.json scripts/upload-court-image.ts <courtId>')
  console.error('Example: ts-node --project tsconfig.seed.json scripts/upload-court-image.ts 1')
  process.exit(1)
}

uploadCourtImage(courtId)
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })

