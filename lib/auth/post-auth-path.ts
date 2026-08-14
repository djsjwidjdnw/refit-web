import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Where a user goes the instant they have a session, whichever door they came through.
 *
 * There are now two of those doors: the password form at /login, and the email-link
 * callback at /auth/callback (confirmation, magic link, recovery). They have to agree, or
 * an operator who confirms an email lands in the customer dashboard while the same
 * operator signing in with a password lands in the cockpit.
 *
 * `is_platform_operator` is DB-gated and evaluated for the calling session's uid, so this
 * is a routing hint only. It decides nothing: /ops is authoritatively gated again in its
 * own layout and in every server action, and a non-operator sent here would simply be
 * bounced back. Do not add access logic to this function.
 */
export async function postAuthPath(supabase: SupabaseClient): Promise<'/ops' | '/dashboard'> {
  const { data: isOperator } = await supabase.rpc('is_platform_operator');
  return isOperator === true ? '/ops' : '/dashboard';
}

/**
 * Sanitises a `?next=` destination carried through an auth link.
 *
 * Supabase will happily round-trip whatever is in the redirect URL, so without this an
 * attacker could mail somebody `…/auth/callback?next=https://evil.example` and have OUR
 * domain perform the hop. Only same-site absolute paths are allowed through:
 *
 *   "/dashboard"        → kept
 *   "//evil.example"    → rejected (protocol-relative URL, browsers treat it as off-site)
 *   "/\\evil.example"   → rejected (backslash; some browsers normalise it to //)
 *   "https://evil.tld"  → rejected
 *   "dashboard"         → rejected (relative, resolves against the callback path)
 */
export function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith('/')) return null;
  if (next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}
