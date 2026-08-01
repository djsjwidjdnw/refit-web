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
  const [techs, setTechs] = useState(10);
  const [minutes, setMinutes] = useState(20);
  const [rate, setRate] = useState(130);
  const days = 240;

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
            value={techs}
            onChange={(e) => setTechs(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
          />
        </label>
        <label className="roi-field">
          <span>Minutes saved / tech / day</span>
          <input
            className="input"
            type="number"
            min={1}
            max={240}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
          />
        </label>
        <label className="roi-field">
          <span>Billable rate ($/hr)</span>
          <input
            className="input"
            type="number"
            min={1}
            max={1000}
            value={rate}
            onChange={(e) => setRate(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
          />
        </label>
      </div>

      <div className="roi-out">
        <div className="roi-line">
          <span>Labour recovered / year</span>
          <b>{money(labour)}</b>
        </div>
        <div className="roi-line">
          <span>ReFit / year</span>
          <b>{money(subscription)}</b>
        </div>
        <div className="roi-line roi-net">
          <span>Difference</span>
          <b>{money(net)}</b>
        </div>
      </div>

      <p className="roi-foot">
        {techs} techs × {minutes} min/day × {days} working days × {money(rate)}/hr. Labour only —
        it excludes avoided duplicate orders and faster turnaround.
      </p>
    </div>
  );
}
