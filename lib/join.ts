import type { SupabaseClient, User } from '@supabase/supabase-js';

// Replays a stashed invite code after the email-confirmation gap.
//
// When a tech signs up via an invite while email confirmation is ON, there is no session
// at submit time, so request_join_shop can't run yet. We stash the code in
// user_metadata.pending_join_code (mirrors how shop_name is stashed for create-shop) and
// replay it here on the first authed load, then clear the flag.
//
// Idempotent + best-effort: request_join_shop ignores a re-submit and rejects with a
// harmless error if the user already belongs to a shop, so this never throws into the page.
export async function replayPendingJoin(supabase: SupabaseClient, user: User): Promise<void> {
  const code = (user.user_metadata as { pending_join_code?: string } | null)?.pending_join_code;
  if (!code) return;

  // rpc() returns { error } rather than throwing on an RLS/business error — we intentionally
  // ignore it (the page reads the real state from my_pending_join / shop_members afterward).
  await supabase.rpc('request_join_shop', { _join_code: code });

  // Clear the flag so we don't re-submit on every load. Best-effort: in a Server Component
  // the refreshed cookie can't be written, but the metadata change still persists in GoTrue,
  // and request_join_shop is idempotent regardless.
  try {
    await supabase.auth.updateUser({ data: { pending_join_code: null } });
  } catch {
    /* no-op */
  }
}
