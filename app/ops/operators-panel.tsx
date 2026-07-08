'use client';

import { useState, useTransition } from 'react';
import { addOperator, removeOperator } from './actions';
import { fmtDate } from './types';

export type OpsOperator = {
  user_id: string;
  email: string | null;
  role: string;
  added_by: string | null;
  added_by_email: string | null;
  created_at: string;
};

// Operators list. Any operator sees it; only an OWNER sees the add form + per-row Remove
// (owners can't be removed). Both actions are confirmed and enforced owner-only at the DB.
export function OperatorsPanel({
  operators,
  isOwner,
  currentUserId,
}: {
  operators: OpsOperator[];
  isOwner: boolean;
  currentUserId: string;
}) {
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const add = () => {
    const e = email.trim();
    if (!e) return;
    if (!window.confirm(`Add ${e} as an operator? (They must already have a ReFit login.)`)) return;
    setMsg(null);
    startTransition(async () => {
      try {
        await addOperator(e);
        setEmail('');
        setMsg(`Added ${e} ✓`);
      } catch (err) {
        setMsg(err instanceof Error ? err.message : 'Failed to add operator');
      }
    });
  };

  const remove = (op: OpsOperator) => {
    if (!window.confirm(`Remove ${op.email ?? op.user_id} from operators?`)) return;
    setMsg(null);
    startTransition(async () => {
      try {
        await removeOperator(op.user_id);
        setMsg(`Removed ${op.email ?? op.user_id} ✓`);
      } catch (err) {
        setMsg(err instanceof Error ? err.message : 'Failed to remove operator');
      }
    });
  };

  return (
    <section className="card" style={{ marginTop: 28 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Operators ({operators.length})</div>

      {operators.map((op) => (
        <div key={op.user_id} className="kv">
          <span className="k">
            {op.email ?? op.user_id}
            {op.user_id === currentUserId && (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> (you)</span>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>
              · added {fmtDate(op.created_at)}
              {op.added_by_email ? ` by ${op.added_by_email}` : ''}
            </span>
          </span>
          <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={op.role === 'owner' ? 'pill pill-accent' : 'pill'}>{op.role}</span>
            {isOwner && op.role !== 'owner' && (
              <button
                className="btn btn-ghost"
                disabled={pending}
                style={{ padding: '4px 10px', fontSize: 13 }}
                onClick={() => remove(op)}
              >
                Remove
              </button>
            )}
          </span>
        </div>
      ))}

      {isOwner ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            type="email"
            placeholder="new-operator@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <button className="btn btn-primary" disabled={pending} onClick={add}>
            Add operator
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>They must already have a ReFit login.</span>
        </div>
      ) : (
        <p className="note" style={{ marginTop: 10, textAlign: 'left' }}>
          Only an owner can add or remove operators.
        </p>
      )}

      {msg && <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 14 }}>{msg}</div>}
    </section>
  );
}
