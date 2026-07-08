import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase auth session on each request and guards /dashboard.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token; do not run code between createServerClient
  // and getUser() or you risk logging users out at random (supabase/ssr guidance).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect the authed area: unauthed hitting /dashboard → /login.
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Operator cockpit (/ops): require a signed-in user here (cheap edge check). The AUTHORITATIVE
  // operator check is DB-backed (is_platform_operator) in the /ops layout + every server action,
  // so a newly-added operator gets in with NO redeploy, and a signed-in NON-operator is
  // redirected server-side by the layout before any /ops content renders.
  if (!user && request.nextUrl.pathname.startsWith('/ops')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
