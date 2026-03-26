import { createAdminClient } from '@/lib/supabase-server'

export async function isFeatureEnabled(flag: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('settings')
    .select('feature_flags')
    .eq('id', 'app')
    .single()

  const flags = (data?.feature_flags ?? {}) as Record<string, boolean>
  // Default: enabled unless explicitly false
  return flags[flag] !== false
}
