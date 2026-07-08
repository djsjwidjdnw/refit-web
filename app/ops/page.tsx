import { createClient } from '@/lib/supabase/server';
import { MetricCards } from './metric-cards';
import { ShopsTable } from './shops-table';
import { OperatorsPanel, type OpsOperator } from './operators-panel';
import type { OpsMetrics, OpsShop } from './types';

export const dynamic = 'force-dynamic';

// Overview: metrics cards + the all-shops table + operators. Data comes ONLY from the
// operator-gated RPCs, so even these fetches are DB-gated (is_platform_operator).
export default async function OpsOverview() {
  const supabase = await createClient();
  const [{ data: { user } }, metricsRes, shopsRes, operatorsRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('ops_metrics'),
    supabase.rpc('ops_list_shops'),
    supabase.rpc('ops_list_operators'),
  ]);

  const metrics = (metricsRes.data ?? null) as OpsMetrics | null;
  const shops = (shopsRes.data ?? []) as OpsShop[];
  const operators = (operatorsRes.data ?? []) as OpsOperator[];
  const currentUserId = user?.id ?? '';
  const isOwner = operators.some((o) => o.user_id === currentUserId && o.role === 'owner');
  // Web gate passed (layout) but DB gate rejected ⇒ the operator email is in the allowlist but
  // the user hasn't been added to platform_operators yet.
  const dbGateRejected = !!metricsRes.error || !!shopsRes.error;

  return (
    <>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '8px 0 2px' }}>Operations</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>Platform-wide view of every shop.</p>

      {dbGateRejected && (
        <div className="error" style={{ marginTop: 12 }}>
          Not authorized at the database layer. Run the operator seed to add your account to
          <code> platform_operators</code>, then reload.
        </div>
      )}

      <MetricCards metrics={metrics} />
      <ShopsTable shops={shops} />
      <OperatorsPanel operators={operators} isOwner={isOwner} currentUserId={currentUserId} />
    </>
  );
}
