import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { ensureDirectThread } from '@/lib/social-graph'
import { isBlockedEitherWay } from '@/lib/moderation'
import { isFeatureEnabled } from '@/lib/feature-flags'

const bodySchema = z.object({
  user_id: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    if (!(await isFeatureEnabled('chat'))) {
      return NextResponse.json({ error: 'Chat is temporarily unavailable' }, { status: 503 })
    }
    const supabase = createServerSupabaseClient(request)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const other = parsed.data.user_id
    if (other === session.user.id) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 400 })
    }

    const { data: target } = await supabase.from('users').select('id').eq('id', other).maybeSingle()
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (await isBlockedEitherWay(supabase as any, session.user.id, other)) {
      return NextResponse.json({ error: 'Cannot message this user' }, { status: 403 })
    }

    const admin = createAdminClient()
    const threadId = await ensureDirectThread(admin, session.user.id, other)
    return NextResponse.json({ thread_id: threadId })
  } catch (err) {
    console.error('POST /api/chat/direct:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
