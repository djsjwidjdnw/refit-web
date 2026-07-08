import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isOperatorEmail } from './allowlist';

// Server-side operator identity, from the REVALIDATED session (getUser verifies the JWT with
// Supabase — a forged cookie can't pass).
//
// SOURCE OF TRUTH = the DATABASE: we ask the DB whether THIS session is a platform operator
// (is_platform_operator, evaluated for auth.uid()). So the instant an owner adds someone via
// /ops, they get access with NO redeploy. The OPS_OPERATOR_EMAILS env is kept ONLY as an
// emergency bootstrap (e.g. before the first owner is seeded, or to recover access) — it is NOT
// the normal path. Every ops_* RPC is independently DB-gated too (defense in depth).
export async function getOperatorUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: dbOperator } = await supabase.rpc('is_platform_operator');
  if (dbOperator === true) return { id: user.id, email: user.email as string };
  if (isOperatorEmail(user.email)) return { id: user.id, email: user.email as string }; // bootstrap
  return null;
}

// Gate a server component / server action. Non-operators are bounced to home (NOT /login — we
// don't hint that /ops exists). Call this at the top of the /ops layout AND every server
// action, so no route or mutation is reachable without it.
export async function requireOperator(): Promise<{ id: string; email: string }> {
  const op = await getOperatorUser();
  if (!op) redirect('/');
  return op;
}
