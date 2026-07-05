import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Service-role Supabase client — bypasses RLS. Used ONLY by the Stripe webhook, which has
// no user session and must write shop_entitlements on Stripe's behalf. Never import this
// into a client component or a user-facing route.
//
// Returns null when the service-role key (or URL) is unset, so the app/build never crashes
// with billing env absent; the webhook treats null as "not configured" and returns 503.
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
