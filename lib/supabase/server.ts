import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server (RSC / route handler) Supabase client, reading the auth session from cookies.
// Anon key only — read from env; never the service-role key.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component (cookies are read-only there). Safe to
            // ignore — the middleware refreshes the session cookie on each request.
          }
        },
      },
    },
  );
}
