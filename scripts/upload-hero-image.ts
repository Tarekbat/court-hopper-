import { createAdminClient } from '../lib/supabase-server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env file
const envPath = join(process.cwd(), '.env')
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

/**
 * Script to upload hero image to Supabase Storage and save URL to database
 * 
 * Usage: 
 *   ts-node --project tsconfig.seed.json scripts/upload-hero-image.ts
 */

async function uploadHeroImage() {
  try {
    const supabase = createAdminClient()
    
    // Read the image file
    const imagePath = join(process.cwd(), 'public', 'hero-image.jpg')
    const imageBuffer = readFileSync(imagePath)
    
    // Generate unique filename
    const fileName = `hero/${Date.now()}-hero-image.jpg`
    
    console.log(`Uploading hero image to Supabase Storage...`)
    
    // Upload to Supabase Storage (using court-images bucket or create a new one)
    // For now, we'll use the court-images bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('court-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true, // Allow overwriting
      })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      throw uploadError
    }

    console.log('Hero image uploaded successfully!')

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('court-images').getPublicUrl(fileName)

    console.log(`Public URL: ${publicUrl}`)

    // Update settings in database
    const { data: settings, error: updateError } = await supabase
      .from('settings')
      .upsert({
        id: 'app',
        hero_image_url: publicUrl,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (updateError) {
      console.error('Error updating settings:', updateError)
      throw updateError
    }

    console.log(`✅ Successfully saved hero image URL to database!`)
    console.log(`Settings updated:`, settings)
    
    return publicUrl
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

uploadHeroImage()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })

