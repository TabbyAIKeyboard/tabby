import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// POST /api/auth/verify-otp - Verify OTP code
export async function POST(request: Request) {
  const supabase = await createSupabaseServer()
  const body = await request.json()

  const { email, otp, type } = body as { email: string; otp: string; type: string }

  const res = await supabase.auth.verifyOtp({
    email: email,
    token: otp,
    type: 'email',
  })

  return NextResponse.json(res)
}
