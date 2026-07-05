'use client';

import { useState } from 'react';
import {
  PLAN_CATALOG,
  annualTotal,
  ENTERPRISE_CONTACT_EMAIL,
  type BillingInterval,
  type PaidPlan,
} from '@/lib/stripe/plans';

// Billing controls on the dashboard card. Three states:
//   • not an admin        → a note (only admins manage billing)
//   • has a Stripe customer → "Manage billing" (opens the Stripe portal)
//   • otherwise (trialing)  → plan buttons + monthly/annual toggle (starts Checkout)
export function PlanPicker({
  shopId,
  canManage,
  hasCustomer,
}: {
  shopId: string;
  canManage: boolean;
  hasCustomer: boolean;
}) {
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: unknown): Promise<void> {
    setError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Try again.');
        setBusy(null);
        return;
      }
      window.location.href = data.url; // → Stripe (Checkout or billing portal)
    } catch {
      setError('Network error. Please try again.');
      setBusy(null);
    }
  }

  function choosePlan(plan: PaidPlan) {
    setBusy(plan);
    void post('/api/checkout', { shopId, plan, interval });
  }
  function manageBilling() {
    setBusy('__portal');
    void post('/api/billing-portal', { shopId });
  }

  if (!canManage) {
    return (
      <p className="note" style={{ textAlign: 'left', marginTop: 16 }}>
        Your shop admin manages billing.
      </p>
    );
  }

  if (hasCustomer) {
    return (
      <div style={{ marginTop: 16 }}>
        <button
          className="btn btn-primary btn-block"
          disabled={busy !== null}
          onClick={manageBilling}
        >
          {busy === '__portal' ? 'Opening…' : 'Manage billing'}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="seg" role="group" aria-label="Billing interval">
        <button
          type="button"
          className={interval === 'month' ? 'on' : ''}
          onClick={() => setInterval('month')}
          aria-pressed={interval === 'month'}
        >
          Monthly
        </button>
        <button
          type="button"
          className={interval === 'year' ? 'on' : ''}
          onClick={() => setInterval('year')}
          aria-pressed={interval === 'year'}
        >
          Annual<span className="save">2 months free</span>
        </button>
      </div>

      <div className="plan-grid">
        {PLAN_CATALOG.map((p) => (
          <button
            key={p.plan}
            type="button"
            className="btn btn-ghost plan-opt"
            disabled={busy !== null}
            onClick={() => choosePlan(p.plan)}
          >
            <span className="po-name">{p.name}</span>
            <span className="po-price">
              {interval === 'year' ? (
                <>
                  ${annualTotal(p.monthly).toLocaleString()}
                  <small>/yr</small>
                </>
              ) : (
                <>
                  ${p.monthly}
                  <small>/mo</small>
                </>
              )}
            </span>
            <span className="po-seats">
              {p.seats} techs{busy === p.plan ? ' · starting…' : ''}
            </span>
          </button>
        ))}

        <a
          className="btn btn-ghost plan-opt"
          href={`mailto:${ENTERPRISE_CONTACT_EMAIL}?subject=${encodeURIComponent(
            'ReFit Enterprise enquiry',
          )}`}
        >
          <span className="po-name">Enterprise</span>
          <span className="po-price" style={{ fontSize: 18 }}>
            Custom
          </span>
          <span className="po-seats">Contact us →</span>
        </a>
      </div>

      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
      <p className="note" style={{ textAlign: 'left', marginTop: 12 }}>
        14-day trial, card required.{' '}
        {interval === 'year' ? 'Billed yearly after the trial.' : 'Billed monthly after the trial.'}{' '}
        Add-on seats $15/tech.
      </p>
    </div>
  );
}
