// Shapes returned by the operator RPCs (0032). Kept in one place so cards/table/drill-in stay
// in sync as columns are added.
export type OpsShop = {
  shop_id: string;
  name: string;
  created_at: string;
  plan: string;
  subscription_status: string;
  managed_manually: boolean;
  billing_interval: string | null;
  seats_included: number;
  seats_used: number;
  add_on_seats: number;
  storage_used_bytes: number;
  active_job_limit: number | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_started_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  member_count: number;
  last_activity: string | null;
  mrr: number;
};

export type OpsMetrics = {
  shops_total: number;
  by_status: Record<string, number>;
  mrr: number;
  arr: number;
  new_signups_7d: number;
  new_signups_30d: number;
  trials_expiring_7d: number;
  past_due_count: number;
  managed_manually_count: number;
};

export type OpsMember = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  added_at: string;
};

export type OpsShopDetail = {
  shop: { id: string; name: string; join_code: string; created_at: string } | null;
  entitlement: Record<string, unknown> | null;
  mrr: number;
  members: OpsMember[];
  join_requests: { user_id: string; email: string | null; requested_at: string }[];
};

export const fmtUsd = (n: number | null | undefined): string =>
  '$' + Math.round(Number(n ?? 0)).toLocaleString();
export const fmtGb = (bytes: number | null | undefined): string =>
  (Number(bytes ?? 0) / 1073741824).toFixed(2) + ' GB';
export const fmtDate = (s: string | null | undefined): string =>
  s ? new Date(s).toLocaleDateString() : '—';
