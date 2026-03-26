import type { SupabaseClient } from '@supabase/supabase-js'

const BAD_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'nigger',
  'faggot',
  'whore',
  'slut',
  'dick',
]

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
}

export function hasProfanity(value: string): boolean {
  const n = normalize(value)
  return BAD_WORDS.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(n))
}

export async function getBlockedUserIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)

  if (error || !data) return new Set<string>()

  const ids = new Set<string>()
  data.forEach((r: { blocker_id: string; blocked_id: string }) => {
    if (r.blocker_id === userId) ids.add(r.blocked_id)
    if (r.blocked_id === userId) ids.add(r.blocker_id)
  })
  return ids
}

export async function isBlockedEitherWay(
  supabase: SupabaseClient,
  me: string,
  other: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_blocks')
    .select('id')
    .or(`and(blocker_id.eq.${me},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${me})`)
    .maybeSingle()
  return Boolean(data)
}
