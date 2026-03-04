'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import { createBrowserClient } from '@/lib/supabase-client'

interface UserProfile {
  id: string
  name: string | null
  email: string
  phone_number: string | null
  image: string | null
  city?: string | null
  is_admin?: boolean
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    city: '',
    image: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profile')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin')
          return
        }
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      setProfile(data)
      setIsAdmin(data.is_admin === true)
      setFormData({
        name: data.name || '',
        phone_number: data.phone_number || '',
        city: data.city || '',
        image: data.image || '',
      })
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const updateData: any = {}
      if (formData.name !== profile?.name) {
        updateData.name = formData.name || null
      }
      if (formData.phone_number !== profile?.phone_number) {
        updateData.phone_number = formData.phone_number || null
      }
      if (formData.city !== profile?.city) {
        updateData.city = formData.city || null
      }
      if (formData.image !== profile?.image) {
        updateData.image = formData.image || null
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setSuccess(true)
      
      // Refresh the session to update user metadata
      const supabase = createBrowserClient()
      await supabase.auth.refreshSession()
      router.refresh()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please select a JPEG, PNG, WebP, or GIF image.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewImage(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const { url } = await response.json()
      setFormData((prev) => ({ ...prev, image: url }))
    } catch (err) {
      console.error('Error uploading image:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload image. Please try again.')
      setPreviewImage(null)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-beige">
          <Header />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
            <div className="mb-6">
              <div className="h-5 bg-stone-soft/80 rounded w-32 mb-4 animate-pulse" />
              <div className="h-9 bg-stone-soft/80 rounded w-48 mb-2 animate-pulse" />
              <div className="h-4 bg-stone-soft/80 rounded w-64 animate-pulse" />
            </div>
            <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-8 animate-pulse">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-stone-soft/80" />
                <div className="flex-1 space-y-3">
                  <div className="h-10 bg-stone-soft/80 rounded-xl w-full" />
                  <div className="h-4 bg-stone-soft/80 rounded w-32" />
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="h-10 bg-stone-soft/80 rounded-xl w-full" />
                <div className="h-10 bg-stone-soft/80 rounded-xl w-full" />
                <div className="h-10 bg-stone-soft/80 rounded-xl w-full" />
              </div>
              <div className="h-10 bg-stone-soft/80 rounded-xl w-24 ml-auto" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-beige">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-ink hover:text-terracotta transition-colors mb-4 font-medium text-sm"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to home
            </Link>
            <h1 className="text-3xl md:text-4xl font-display text-ink mb-1">
              My profile
            </h1>
            <p className="text-stone text-base">
              Manage your account information
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-soft shadow-sm p-6 md:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 font-medium text-sm">
                Profile updated successfully.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Image */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Profile photo
                </label>
                <div className="flex items-start gap-6">
                  <div className="relative">
                    {previewImage || formData.image ? (
                      <img
                        src={previewImage || formData.image || ''}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-2 border-stone-soft shadow-sm"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=8B4513&color=fff&size=128`
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-terracotta flex items-center justify-center text-white text-2xl font-semibold border-2 border-stone-soft shadow-sm">
                        {(formData.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor="image-upload"
                      className={`block w-full px-4 py-2.5 border-2 border-dashed border-stone-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta bg-white text-ink cursor-pointer hover:border-stone hover:bg-beige transition-colors text-center font-medium text-sm ${
                        uploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-terracotta border-t-transparent"></div>
                          Uploading…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg
                            className="w-5 h-5 text-terracotta"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                          </svg>
                          {formData.image ? 'Change photo' : 'Upload photo'}
                        </span>
                      )}
                    </label>
                    <input
                      type="file"
                      id="image-upload"
                      name="image"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      disabled={uploading}
                      className="hidden"
                    />
                    <p className="mt-2 text-xs text-stone">
                      JPEG, PNG, WebP, or GIF. Max 5MB.
                    </p>
                    {formData.image && !uploading && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, image: '' }))
                          setPreviewImage(null)
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Full name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-stone-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta bg-white text-ink placeholder-stone"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-stone-soft rounded-xl bg-stone-soft/50 text-stone cursor-not-allowed"
                />
                <p className="mt-2 text-xs text-stone">
                  Email cannot be changed. Contact support if you need to update it.
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="phone_number"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Phone number
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-stone-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta bg-white text-ink placeholder-stone"
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* City (optional - for "near you" discovery) */}
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  City (optional)
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-stone-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta bg-white text-ink placeholder-stone"
                  placeholder="e.g. Orlando"
                />
                <p className="mt-1 text-xs text-stone">Used to show players and groups near you.</p>
              </div>

              {/* Account Info */}
              {profile && (
                <div className="pt-6 border-t border-stone-soft">
                  <h3 className="text-sm font-medium text-ink mb-4">
                    Account information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-stone mb-1">Member since</p>
                      <p className="text-ink font-medium">
                        {new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone mb-1">Last updated</p>
                      <p className="text-ink font-medium">
                        {new Date(profile.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-stone-soft">
                <Link
                  href="/"
                  className="px-5 py-2.5 text-ink border border-stone-soft rounded-xl hover:border-stone hover:bg-beige transition-all font-medium text-sm"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 btn-premium text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>

            {/* Hero Image Management Section (Admin Only) */}
            {isAdmin && (
            <div className="mt-12 bg-white rounded-2xl border border-stone-soft shadow-sm p-6 md:p-8">
              <h2 className="text-xl font-display text-ink mb-2">
                Hero image management
              </h2>
              <p className="text-stone text-sm mb-6">
                Change the hero image displayed on the homepage
              </p>

              <HeroImageUpload />
            </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

// Hero Image Upload Component
function HeroImageUpload() {
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    fetchHeroImage()
  }, [])

  const fetchHeroImage = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const settings = await response.json()
        setHeroImageUrl(settings.hero_image_url)
      }
    } catch (err) {
      console.error('Error fetching hero image:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/settings/hero-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload hero image')
      }

      const data = await response.json()
      setHeroImageUrl(data.url)
      setSuccess(true)
      setPreview(null)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload hero image')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium">
          Hero image updated. It will appear on the homepage after refresh.
        </div>
      )}

      {(heroImageUrl || preview) && (
        <div className="relative w-full h-64 rounded-xl overflow-hidden border border-stone-soft shadow-sm">
          <img
            src={preview || heroImageUrl || ''}
            alt="Hero preview"
            className="w-full h-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-white border-t-transparent mx-auto mb-2"></div>
                <p className="text-white text-sm font-medium">Uploading…</p>
              </div>
            </div>
          )}
        </div>
      )}

      <label
        htmlFor="hero-image-upload"
        className={`block w-full px-6 py-3 border-2 border-dashed border-stone-soft rounded-xl cursor-pointer hover:border-stone hover:bg-beige transition-colors text-center font-medium text-sm text-ink ${
          uploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-terracotta border-t-transparent"></div>
            Uploading…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-terracotta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {heroImageUrl ? 'Change hero image' : 'Upload hero image'}
          </span>
        )}
      </label>
      <input
        id="hero-image-upload"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={uploading}
        onChange={handleFileChange}
      />
      <p className="text-xs text-stone text-center">
        Recommended: 1920×1080px or larger. Max 10MB. JPEG, PNG, WebP, GIF
      </p>
    </div>
  )
}

