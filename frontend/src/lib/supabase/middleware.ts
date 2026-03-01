import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { protectedPaths, authPaths, onboardingPath } from '@/lib/constants'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const user = await supabase.auth.getUser()
  const url = new URL(request.url)
  const next = url.searchParams.get('next')
  
  // Check onboarding status from cookie
  const onboardingComplete = request.cookies.get('onboarding_complete')?.value === 'true'
  
  if (user.data.user?.id) {
    // User is logged in
    if (authPaths.includes(url.pathname)) {
      // Redirect from auth pages to onboarding if not complete, otherwise to home
      if (!onboardingComplete) {
        return NextResponse.redirect(new URL(onboardingPath, request.url))
      }
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // If user is on onboarding page and already completed, redirect to home
    if (url.pathname === onboardingPath && onboardingComplete) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // If user is accessing protected paths (except onboarding) and hasn't completed onboarding
    if (!onboardingComplete && protectedPaths.includes(url.pathname) && url.pathname !== onboardingPath) {
      return NextResponse.redirect(new URL(onboardingPath, request.url))
    }
    
    return response
  } else {
    // User is not logged in
    if (protectedPaths.includes(url.pathname)) {
      return NextResponse.redirect(new URL('/signin?next=' + (next || url.pathname), request.url))
    }
    return response
  }
}
