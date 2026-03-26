import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationCategory = 'matches' | 'social' | 'groups' | 'system'

export async function notifyUser(
  admin: SupabaseClient,
  params: {
    user_id: string
    category: NotificationCategory
    type: string
    title: string
    body?: string | null
    link_url?: string | null
    metadata?: Record<string, unknown>
  }
) {
  const { error } = await admin.from('notifications').insert({
    user_id: params.user_id,
    category: params.category,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link_url: params.link_url ?? null,
    metadata: params.metadata ?? {},
  })
  if (error) throw error
}
