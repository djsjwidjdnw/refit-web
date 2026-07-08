import type { OpsMetrics } from './types';
import { fmtUsd } from './types';

// Config-driven metric cards: add a card by adding one entry here (each is its own value
// selector over the single ops_metrics() payload). Keeps the overview modular.
const CARDS: { key: string; label: string; value: (m: OpsMetrics) => string }[] = [
  { key: 'shops', label: 'Shops', value: (m) => String(m.shops_total) },
  { key: 'mrr', label: 'MRR', value: (m) => fmtUsd(m.mrr) },
  { key: 'arr', label: 'ARR', value: (m) => fmtUsd(m.arr) },
  { key: 'active', label: 'Active', value: (m) => String(m.by_status?.active ?? 0) },
  { key: 'trialing', label: 'Trialing', value: (m) => String(m.by_status?.trialing ?? 0) },
  { key: 'past_due', label: 'Past due', value: (m) => String(m.past_due_count) },
  { key: 'canceled', label: 'Canceled', value: (m) => String(m.by_status?.canceled ?? 0) },
  { key: 'signups7', label: 'New · 7d', value: (m) => String(m.new_signups_7d) },
  { key: 'signups30', label: 'New · 30d', value: (m) => String(m.new_signups_30d) },
  { key: 'trials_exp', label: 'Trials expiring · 7d', value: (m) => String(m.trials_expiring_7d) },
  { key: 'managed', label: 'Comped / Ent.', value: (m) => String(m.managed_manually_count) },
];

export function MetricCards({ metrics }: { metrics: OpsMetrics | null }) {
  if (!metrics) return null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 12,
        marginTop: 16,
      }}
    >
      {CARDS.map((c) => (
        <div key={c.key} className="card" style={{ padding: 14 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
            {c.label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{c.value(metrics)}</div>
        </div>
      ))}
    </div>
  );
}
