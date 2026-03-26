import { createServerSupabaseClient, createAdminClient } from './supabase-server'
import type { NextRequest, NextResponse } from 'next/server'

// Get the current user session
export async function getServerSession() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

// Get the current user
export async function getCurrentUser() {
  const session = await getServerSession()
  if (!session) return null

  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Sign up a new user
export async function signUp(
  email: string,
  password: string,
  name?: string,
  request?: NextRequest,
  response?: NextResponse
) {
  const supabase = createServerSupabaseClient(request, response)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || '',
      },
    },
  })

  if (error) throw error

  // Create user record in public.users table if signup was successful
  if (data.user) {
    const adminClient = createAdminClient()
    await adminClient.from('users').upsert({
      id: data.user.id,
      email: data.user.email!,
      name: name || null,
      email_verified: data.user.email_confirmed_at,
      image: data.user.user_metadata?.avatar_url || null,
    })
  }

  return data
}

// Sign in a user
export async function signIn(email: string, password: string, request?: NextRequest, response?: NextResponse) {
  const supabase = createServerSupabaseClient(request, response)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

// Sign out the current user
export async function signOut(request?: NextRequest, response?: NextResponse) {
  const supabase = createServerSupabaseClient(request, response)
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get user by email (for credentials provider compatibility)
export async function getUserByEmail(email: string) {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) return null
  return data
}

// Check if a user is an admin
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    
    // Try to select is_admin, but handle gracefully if column doesn't exist
    const { data: user, error } = await adminClient
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    // If column doesn't exist (error code 42703), return false
    if (error) {
      if (error.code === '42703' && error.message?.includes('is_admin')) {
        // Column doesn't exist yet, return false
        return false
      }
      // Other errors also return false
      return false
    }

    if (!user) return false
    return user.is_admin === true
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Check if the current user is an admin
export async function getCurrentUserIsAdmin(): Promise<boolean> {
  const session = await getServerSession()
  if (!session?.user?.id) return false
  return isAdmin(session.user.id)
}
