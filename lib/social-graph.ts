import type { SupabaseClient } from '@supabase/supabase-js'

/** Lexicographic pair key for a stable direct thread id. */
export function directPairKey(userIdA: string, userIdB: string): string {
  return userIdA < userIdB ? `${userIdA}:${userIdB}` : `${userIdB}:${userIdA}`
}

export async function ensureDirectThread(
  admin: SupabaseClient,
  userA: string,
  userB: string
): Promise<string> {
  if (userA === userB) throw new Error('Invalid pair')
  const pair = directPairKey(userA, userB)
  const { data: existing } = await admin
    .from('chat_threads')
    .select('id')
    .eq('direct_pair_key', pair)
    .maybeSingle()
  if (existing?.id) return existing.id as string

  const { data: thread, error: te } = await admin
    .from('chat_threads')
    .insert({ thread_kind: 'direct', direct_pair_key: pair })
    .select('id')
    .single()
  if (te) throw te
  const tid = thread.id as string
  const { error: me } = await admin.from('chat_thread_members').insert([
    { thread_id: tid, user_id: userA },
    { thread_id: tid, user_id: userB },
  ])
  if (me) throw me
  return tid
}

export async function ensureGroupChatThread(
  admin: SupabaseClient,
  groupId: string
): Promise<string> {
  const { data: existing } = await admin
    .from('chat_threads')
    .select('id')
    .eq('group_id', groupId)
    .maybeSingle()
  if (existing?.id) return existing.id as string

  const { data: thread, error: te } = await admin
    .from('chat_threads')
    .insert({ thread_kind: 'group', group_id: groupId })
    .select('id')
    .single()
  if (te) throw te
  const tid = thread.id as string

  const { data: members, error: memErr } = await admin
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
  if (memErr) throw memErr
  if (members?.length) {
    const { error: ins } = await admin.from('chat_thread_members').insert(
      members.map((m: { user_id: string }) => ({ thread_id: tid, user_id: m.user_id }))
    )
    if (ins) throw ins
  }
  return tid
}

export async function syncGroupChatMembers(admin: SupabaseClient, groupId: string, threadId: string) {
  const { data: members } = await admin.from('group_members').select('user_id').eq('group_id', groupId)
  const { data: current } = await admin.from('chat_thread_members').select('user_id').eq('thread_id', threadId)
  const have = new Set((current ?? []).map((r: { user_id: string }) => r.user_id))
  const toAdd = (members ?? [])
    .map((m: { user_id: string }) => m.user_id)
    .filter((uid: string) => !have.has(uid))
  if (toAdd.length) {
    await admin
      .from('chat_thread_members')
      .insert(toAdd.map((user_id: string) => ({ thread_id: threadId, user_id })))
  }
}
