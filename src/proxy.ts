import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Protected path prefixes — unauthenticated users are redirected to /auth
const PROTECTED = ['/dashboard', '/profile', '/matches', '/participants', '/chat', '/history', '/notifications', '/admin']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session so tokens stay alive across tab re-opens
  // Always use getUser() (not getSession()) on the server
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Authenticated users visiting landing or auth → send to dashboard
  if (user && (pathname === '/' || pathname.startsWith('/auth'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Unauthenticated users visiting protected routes → send to auth
  if (!user && PROTECTED.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/auth', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|og-image.png|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
