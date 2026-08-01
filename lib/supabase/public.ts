import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Cookieless anon client for PUBLIC, cacheable reads — currently just the landing page's
// pricing table.
//
// Why this exists instead of reusing lib/supabase/server.ts: that client calls cookies(),
// and touching cookies() opts the whole route into dynamic rendering. The landing page has
// no user-specific content, so paying for a cookie read plus a Supabase round trip before
// first byte on every ad click was pure latency. With no session in play the page can be
// statically generated and revalidated on a timer instead.
//
// Anon key only. Never use this for anything that must respect a user's session — it has
// no session, so RLS sees it as the anon role.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
