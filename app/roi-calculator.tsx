'use client';

import { useState } from 'react';

// The "run your own numbers" element. A client component so the page itself stays a
// server component that reads live pricing.
//
// Defaults are the worked example from the sales sheet. Everything is deliberately
// adjustable downward — the argument only holds if a sceptical shop owner can dial it
// back to numbers they believe and still see it clear the subscription.

const MONTHLY_BY_TECHS = (techs: number) => {
  // Mirrors the published tiers: Lite 5 seats $99, Pro 10 $179, Max 20 $299, then
  // $15/extra seat. Kept in sync with the pricing section below it.
  if (techs <= 5) return 99;
  if (techs <= 10) return 179;
  if (techs <= 20) return 299;
  return 299 + (techs - 20) * 15;
};

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function RoiCalculator() {
  // Kept as strings so a field can be empty mid-edit. Clamping on every keystroke made
  // the inputs impossible to clear and retype on a phone — backspacing snapped them to 1.
  const [techsRaw, setTechsRaw] = useState('10');
  const [minutesRaw, setMinutesRaw] = useState('20');
  const [rateRaw, setRateRaw] = useState('130');
  const days = 240;

  const clamp = (raw: string, min: number, max: number, fallback: number) => {
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  };
  const techs = clamp(techsRaw, 1, 200, 1);
  const minutes = clamp(minutesRaw, 1, 240, 1);
  const rate = clamp(rateRaw, 1, 1000, 1);

  const labour = (techs * minutes * days * rate) / 60;
  const subscription = MONTHLY_BY_TECHS(techs) * 12;
  const net = labour - subscription;

  return (
    <div className="roi card">
      <div className="roi-inputs">
        <label className="roi-field">
          <span>Techs</span>
          <input
            className="input"
            type="number"
            min={1}
            max={200}
            value={techsRaw}
            onChange={(e) => setTechsRaw(e.target.value)}
            onBlur={() => setTechsRaw(String(techs))}
          />
        </label>
        <label className="roi-field">
          <span>Minutes saved / tech / day</span>
          <input
            className="input"
            type="number"
            min={1}
            max={240}
            value={minutesRaw}
            onChange={(e) => setMinutesRaw(e.target.value)}
            onBlur={() => setMinutesRaw(String(minutes))}
          />
        </label>
        <label className="roi-field">
          <span>Billable rate ($/hr)</span>
          <input
            className="input"
            type="number"
            min={1}
            max={1000}
            value={rateRaw}
            onChange={(e) => setRateRaw(e.target.value)}
            onBlur={() => setRateRaw(String(rate))}
          />
        </label>
      </div>

      <div className="roi-out">
        <div className="roi-line">
          <span>Labor recovered / year</span>
          <b>{money(labour)}</b>
        </div>
        <div className="roi-line">
          <span>ReFitIQ / year</span>
          <b>{money(subscription)}</b>
        </div>
        <div className="roi-line roi-net">
          <span>Difference</span>
          <b>{money(net)}</b>
        </div>
      </div>

      <p className="roi-foot">
        {techs} techs × {minutes} min/day × {days} working days × {money(rate)}/hr. Labor only —
        it excludes avoided duplicate orders and faster turnaround.
      </p>
    </div>
  );
}
