import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isOperatorEmail } from './allowlist';

// Server-side operator identity, from the REVALIDATED session (getUser verifies the JWT with
// Supabase — a forged cookie can't pass). Returns null for anyone whose email isn't in the
// OPS_OPERATOR_EMAILS allowlist. This is the web gate; the DB is_platform_operator() check on
// every ops_* RPC is the second, independent gate (defense in depth).
export async function getOperatorUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isOperatorEmail(user.email)) return null;
  return { id: user.id, email: user.email as string };
}

// Gate a server component / server action. Non-operators are bounced to home (NOT /login — we
// don't hint that /ops exists). Call this at the top of the /ops layout AND every server
// action, so no route or mutation is reachable without it.
export async function requireOperator(): Promise<{ id: string; email: string }> {
  const op = await getOperatorUser();
  if (!op) redirect('/');
  return op;
}
