'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { OpsShop } from './types';
import { fmtUsd, fmtGb, fmtDate } from './types';

const STATUSES = ['all', 'trialing', 'active', 'past_due', 'canceled', 'none'];

export function ShopsTable({ shops }: { shops: OpsShop[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [manualOnly, setManualOnly] = useState(false);

  const rows = useMemo(
    () =>
      shops.filter((s) => {
        if (status !== 'all' && s.subscription_status !== status) return false;
        if (manualOnly && !s.managed_manually) return false;
        if (q && !s.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
        return true;
      }),
    [shops, q, status, manualOnly],
  );

  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Search shops…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={manualOnly} onChange={(e) => setManualOnly(e.target.checked)} />
          Comped / Ent. only
        </label>
        <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 'auto' }}>
          {rows.length} of {shops.length}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 12 }}>
              {['Shop', 'Plan', 'Status', 'Seats', 'Storage', 'MRR', 'Created', 'Last activity'].map((h) => (
                <th key={h} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, #333)', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.shop_id}>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, #2a2a2a)' }}>
                  <Link href={`/ops/shops/${s.shop_id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {s.name}
                  </Link>
                  {s.managed_manually && (
                    <span className="pill" style={{ marginLeft: 6, fontSize: 11 }}>
                      manual
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, #2a2a2a)', textTransform: 'capitalize' }}>
                  {s.plan}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, #2a2a2a)' }}>
                  <span className="pill">{s.subscription_status}</span>
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, #2a2a2a)', whiteSpace: 'nowrap' }}>
                  {s.seats_used}/{s.seats_included + s.add_on_seats}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, #2a2a2a)', whiteSpace: 'nowrap' }}>
                  {fmtGb(s.storage_used_bytes)}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, #2a2a2a)' }}>{fmtUsd(s.mrr)}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, #2a2a2a)', whiteSpace: 'nowrap' }}>
                  {fmtDate(s.created_at)}
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border, #2a2a2a)', whiteSpace: 'nowrap' }}>
                  {fmtDate(s.last_activity)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 16, color: 'var(--text-muted)' }}>
                  No shops match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
