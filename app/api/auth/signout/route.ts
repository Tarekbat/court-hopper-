import { NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await signOut()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error signing out:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

