import type { SupabaseClient } from '@supabase/supabase-js'

export type RsvpStatus = 'going' | 'maybe' | 'no'

/**
 * Reassign waitlist_position for all "going" RSVPs.
 * First maxCapacity (by created_at) get waitlist_position = null (confirmed).
 * Rest get 1, 2, 3, ... (waitlist). If maxCapacity is null, everyone confirmed.
 */
export async function rebalanceGroupEventRsvps(
  admin: SupabaseClient,
  eventId: string,
  maxCapacity: number | null
) {
  const { data: goingRows, error } = await admin
    .from('group_event_rsvps')
    .select('user_id, created_at')
    .eq('event_id', eventId)
    .eq('status', 'going')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  const ordered = (goingRows ?? []) as { user_id: string }[]

  if (maxCapacity == null || maxCapacity <= 0) {
    for (const row of ordered) {
      const { error: uerr } = await admin
        .from('group_event_rsvps')
        .update({ waitlist_position: null })
        .eq('event_id', eventId)
        .eq('user_id', row.user_id)
      if (uerr) throw new Error(uerr.message)
    }
    return
  }

  for (let i = 0; i < ordered.length; i++) {
    const waitlist_position = i < maxCapacity ? null : i - maxCapacity + 1
    const { error: uerr } = await admin
      .from('group_event_rsvps')
      .update({ waitlist_position })
      .eq('event_id', eventId)
      .eq('user_id', ordered[i].user_id)
    if (uerr) throw new Error(uerr.message)
  }
}

export function buildRsvpSummary(rows: { user_id: string; status: string; waitlist_position: number | null }[]) {
  let going = 0
  let maybe = 0
  let no = 0
  let confirmed = 0
  let waitlist = 0
  for (const r of rows) {
    if (r.status === 'going') {
      going += 1
      if (r.waitlist_position == null) confirmed += 1
      else waitlist += 1
    } else if (r.status === 'maybe') maybe += 1
    else if (r.status === 'no') no += 1
  }
  return { going, maybe, no, confirmed, waitlist }
}
