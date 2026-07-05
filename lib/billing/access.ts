import { createClient } from '@/lib/supabase/server';

// Shared authz for the billing routes: the caller must be signed in AND an 'admin' of the
// target shop. Uses the authed (RLS-respecting) server client — shop_members is readable by
// members, and only an admin row satisfies the role check, so this is safe against a member
// trying to bill a shop they don't administer.
export type ShopAdminCheck =
  | { ok: true; userId: string; userEmail: string | null }
  | { ok: false; status: number; message: string };

export async function requireShopAdmin(shopId: string): Promise<ShopAdminCheck> {
  if (!shopId || typeof shopId !== 'string') {
    return { ok: false, status: 400, message: 'Missing shop id.' };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, message: 'Not signed in.' };

  const { data: member } = await supabase
    .from('shop_members')
    .select('role')
    .eq('shop_id', shopId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) return { ok: false, status: 403, message: 'Not a member of this shop.' };
  if (member.role !== 'admin') {
    return { ok: false, status: 403, message: 'Only a shop admin can manage billing.' };
  }
  return { ok: true, userId: user.id, userEmail: user.email ?? null };
}

// Origin for building success/return URLs. Prefers NEXT_PUBLIC_SITE_URL (set in Vercel);
// falls back to the request's forwarded host so it also works on preview deployments and
// localhost.
export function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const h = request.headers;
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : 'http://localhost:3000';
}
