'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireOperator } from '@/lib/ops/access';

// Every operator write action goes through here. TWO independent gates run on each call:
//   1. requireOperator() — web/email allowlist (redirects a non-operator before any RPC).
//   2. the ops_* RPC itself raises unless is_platform_operator() (DB/user-id allowlist).
// A client can only ever reach these as server actions; there is no client-trusted path.
async function operatorRpc(fn: string, args: Record<string, unknown>, shopId: string): Promise<void> {
  await requireOperator();
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  revalidatePath('/ops');
  revalidatePath(`/ops/shops/${shopId}`);
}

export async function compShop(shopId: string): Promise<void> {
  await operatorRpc('ops_comp_shop', { _shop_id: shopId }, shopId);
}

export async function extendTrial(shopId: string, days: number): Promise<void> {
  await operatorRpc('ops_extend_trial', { _shop_id: shopId, _days: days }, shopId);
}

export async function cancelShop(shopId: string): Promise<void> {
  await operatorRpc('ops_cancel_shop', { _shop_id: shopId }, shopId);
}

export async function reactivateShop(shopId: string): Promise<void> {
  await operatorRpc('ops_reactivate_shop', { _shop_id: shopId }, shopId);
}

export async function setEnterprise(shopId: string, on: boolean): Promise<void> {
  await operatorRpc('ops_set_enterprise', { _shop_id: shopId, _on: on }, shopId);
}
