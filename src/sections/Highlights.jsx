import React from "react";
import { jumpTo } from "../ui";
import { OTHER_GENERAL_GOVERNMENT, administratorCost } from "../labels";
import { usd, signedPct, change, apCount } from "../format";
import { GENERAL_FUND } from "./GeneralFund";

// The most recent earlier year whose levy grew at least as much as the budget
// year's; null when none did.
function largestSince(lf, year) {
  const i = lf.years.indexOf(year);
  if (i < 1) throw new Error(`levy_by_fund has no year before ${year}`);
  const growth = (k) => change(lf.total[k], lf.total[k - 1]);
  for (let k = i - 1; k >= 1; k--) if (growth(k) >= growth(i)) return lf.years[k];
  return null;
}

// Four findings from the proposal, each a link to the section that shows it.
// Every figure is computed from the data; the words around them are fixed.
export default function Highlights({ b, fees, status }) {
  const { years } = b.meta;
  const lf = b.levy_by_fund;
  const i = lf.years.indexOf(years.budget);
  const levyGrowth = change(lf.total[i], lf.total[i - 1]);
  const since = largestSince(lf, years.budget);
  const below = b.units.filter((u) => u.total_expenses.proposed < u.total_expenses.requested).length;
  const above = b.units.filter((u) => u.total_expenses.proposed > u.total_expenses.requested).length;
  const ogg = b.units.find((u) => u.name === OTHER_GENERAL_GOVERNMENT && u.fund_group === GENERAL_FUND);
  if (!ogg) throw new Error(`units has no ${OTHER_GENERAL_GOVERNMENT}`);
  const changes = fees.groups.flatMap((g) => g.changes);
  const up = changes.filter((c) => c.kind === "rate" && c.budget > c.current).length;

  const items = [
    { id: "levy", fig: signedPct(levyGrowth),
      label: since ? `levy increase, the largest since ${since}` : `levy increase, the largest since at least ${lf.years[1]}` },
    { id: "departments", fig: `${below} of ${b.units.length}`,
      label: `budgets came in below what was requested; ${apCount(above)} came in above` },
    { id: "general-fund", fig: usd(administratorCost(ogg)), label: "for a proposed city administrator" },
    { id: "fees", fig: String(changes.length), label: `fee changes; ${apCount(up)} go up` },
  ];

  return (
    <section className="hl" aria-labelledby="hl-title">
      <div className="hl-head">
        <h2 id="hl-title">What&rsquo;s in the proposal</h2>
        <p className="status-line">{status}</p>
      </div>
      <div className="hl-grid">
        {items.map((it) => (
          <a key={it.id} className="hl-item" href={`#${it.id}`} onClick={jumpTo(it.id)}>
            <span className="hl-fig">{it.fig}</span>
            <span className="hl-label">{it.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
