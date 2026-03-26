import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from './api-auth'
import { isAdmin } from './auth'

export async function requireAdmin(
  request: NextRequest,
  opts: { requireVerifiedEmail?: boolean } = {}
) {
  const auth = await requireAuth(request, {
    requireVerifiedEmail: opts.requireVerifiedEmail,
  })

  if (auth instanceof NextResponse) return auth

  const admin = await isAdmin(auth.session.user.id)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
  }

  return auth
}

