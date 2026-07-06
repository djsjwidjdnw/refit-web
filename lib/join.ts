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

  // rpc() returns { error } rather than throwing. Only clear the stashed code once the
  // request actually recorded — otherwise a transient failure on a VALID code would strand
  // the tech on the create-shop CTA and they'd become an accidental admin. Keeping the code
  // simply replays (idempotently) on the next load. A genuinely invalid/expired code keeps
  // erroring, and the dashboard shows the "invite couldn't be applied" state, not create-shop.
  const { error } = await supabase.rpc('request_join_shop', { _join_code: code });
  if (error) return;

  // Success → clear the flag so we don't re-submit forever. Best-effort: in a Server
  // Component the refreshed cookie can't be written, but the metadata change still persists
  // in GoTrue, and a stray replay is idempotent anyway.
  try {
    await supabase.auth.updateUser({ data: { pending_join_code: null } });
  } catch {
    /* no-op */
  }
}
