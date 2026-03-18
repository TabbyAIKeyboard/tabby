import supabaseAdmin from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const data = await request.json()
  const supabase = supabaseAdmin()

  // For local development: use admin createUser which auto-confirms the email
  // This avoids needing Resend email service for local dev
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })

  if (createError) {
    // If user already exists, that's fine - they can sign in
    if (createError.message?.includes('already been registered')) {
      return Response.json({
        data: null,
        error: { message: 'User already exists. Please sign in instead.' },
      })
    }
    return Response.json({ data: null, error: createError })
  }

  return Response.json({ data: userData, error: null })
}
