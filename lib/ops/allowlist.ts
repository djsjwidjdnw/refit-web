// Operator email allowlist — the WEB half of the /ops gate (the DB half is
// is_platform_operator() on every ops_* RPC). Pure env parsing, no server-only imports, so
// it is safe to use from Edge middleware AND server components/actions.
//
// FAIL-CLOSED: if OPS_OPERATOR_EMAILS is unset or empty, there are NO operators and every
// check returns false. Set it in Vercel (comma-separated), e.g. "me@x.com, ops@x.com".
export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.OPS_OPERATOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length === 0) return false;
  return allow.includes(email.trim().toLowerCase());
}
