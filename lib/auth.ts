import { createServerSupabaseClient, createAdminClient } from './supabase-server'
import { cookies } from 'next/headers'

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
export async function signUp(email: string, password: string, name?: string) {
  const supabase = createServerSupabaseClient()
  
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
export async function signIn(email: string, password: string) {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

// Sign out the current user
export async function signOut() {
  const supabase = createServerSupabaseClient()
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
