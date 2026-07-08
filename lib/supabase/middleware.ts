import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isOperatorEmail } from '@/lib/ops/allowlist';

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

  // Operator cockpit (/ops): the WEB gate. Anyone who isn't a signed-in operator (email in the
  // OPS_OPERATOR_EMAILS allowlist) is bounced to home — no /login hint that /ops exists. The
  // /ops layout + every server action re-check this, and every ops_* RPC is DB-gated too.
  if (request.nextUrl.pathname.startsWith('/ops') && !isOperatorEmail(user?.email)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
