import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/api-admin'

const userAdminUpdateSchema = z.object({
  is_admin: z.boolean().optional(),
  reset_password: z.boolean().optional(),
  suspend_account: z.boolean().optional(),
  // Optional redirect for reset email link. Defaults to app route.
  redirectTo: z.string().url().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { userId } = params
    const body = userAdminUpdateSchema.parse(await request.json())

    const admin = createAdminClient()
    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (userErr || !userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (typeof body.is_admin === 'boolean') {
      const { error } = await admin
        .from('users')
        .update({ is_admin: body.is_admin })
        .eq('id', userId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (body.reset_password) {
      // Sends the password reset email using Supabase configured email provider.
      // This does not require the user to be logged in.
      const supabase = createServerSupabaseClient(request)
      const redirectTo =
        body.redirectTo || `${request.nextUrl.origin}/auth/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(userRow.email, {
        redirectTo,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (typeof body.suspend_account === 'boolean') {
      const { error: suspendError } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: body.suspend_account ? '876000h' : 'none',
      })
      if (suspendError) {
        return NextResponse.json({ error: suspendError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error in PATCH /api/admin/users/[userId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

