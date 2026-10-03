import React, { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHead } from "../ui";
import { printedPage } from "../labels";
import { usd, usdCents, pct, signedPct } from "../format";

// Whole dollars print without cents; $10.50 and $6.25 keep them.
const money = (n) => (Number.isInteger(n) ? usd(n) : usdCents(n));
const signedMoney = (n) => (n > 0 ? "+" : "") + money(n);

const direction = (c) => (c.kind !== "rate" ? c.kind : c.budget > c.current ? "up" : "down");

// "1 is", "2 are": counts in running text.
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Rates({ c }) {
  if (c.kind === "rate") {
    return <span className="fee-rates"><span>{money(c.current)}</span><span aria-label="to"> → </span><span>{money(c.budget)}</span></span>;
  }
  if (c.kind === "removed") {
    return <span className="fee-rates"><span>{c.current_text}</span><span aria-label="to"> → </span><span>none</span></span>;
  }
  return <span className="fee-rates"><span>discounts</span><span aria-label="to"> → </span><span>{money(c.budget)}</span></span>;
}

function Delta({ c }) {
  if (c.kind === "removed") return <span className="fee-chg">dropped</span>;
  if (c.kind === "restructured") return <span className="fee-chg">flat price</span>;
  const d = Math.round((c.budget - c.current) * 100) / 100;
  return (
    <span className="fee-chg">
      <span className="chg-glyph" aria-hidden="true">{d > 0 ? "▲" : "▼"}</span>
      {signedMoney(d)}
      {c.current > 0 && <span className="fee-pct"> ({signedPct(((c.budget - c.current) / c.current) * 100)})</span>}
    </span>
  );
}

function FeeRow({ c, meta }) {
  // A restructured fee's old terms are quoted as the city printed them.
  const note = c.kind === "restructured" ? `In ${meta.years.current}: “${c.current_text}”` : c.note;
  return (
    <li className="fee">
      <span className="fee-name">
        {c.fee}
        {c.detail && <span className="fee-detail">{c.detail}</span>}
      </span>
      <Rates c={c} />
      <Delta c={c} />
      {note && <p className="fee-note">{note}</p>}
    </li>
  );
}

export default function Fees({ fees, b, status }) {
  const { years } = b.meta;
  const all = useMemo(() => fees.groups.flatMap((g) => g.changes), [fees]);
  const tally = all.reduce((t, c) => ({ ...t, [direction(c)]: (t[direction(c)] || 0) + 1 }), {});
  const offset = fees.source.printed_page_offset;
  const pageRange = `${fees.source.first_page - offset}–${fees.source.last_page - offset}`;

  // Largest percentage increases among ordinary rates, for the lead list.
  const biggest = useMemo(() => all
    .filter((c) => c.kind === "rate" && c.current > 0 && c.budget > c.current)
    .map((c) => ({ ...c, pct: ((c.budget - c.current) / c.current) * 100 }))
    .sort((a, z) => z.pct - a.pct)
    .slice(0, 5), [all]);

  return (
    <section id="fees" className="block">
      <SectionHead kicker="Fees and charges" title={`Fees that change in ${years.budget}`} status={status}>
        The proposed fee schedule changes {all.length} rates. {count(tally.up || 0, "goes up", "go up")} and{" "}
        {count(tally.down || 0, "goes down", "go down")}; {count(tally.removed || 0, "fee is dropped", "fees are dropped")}{" "}
        and {count(tally.restructured || 0, "pass becomes", "passes become")} a flat price. Most are parking permits and
        park, pool and event rentals.
      </SectionHead>

      <div className="fee-lead">
        <h3 className="fee-lead-title">Largest increases, by percentage</h3>
        <ol className="fee-lead-list">
          {biggest.map((c) => (
            <li key={c.fee + c.detail}>
              <span className="fee-lead-name">
                {c.fee}
                {c.detail && <span className="fee-detail">{c.detail}</span>}
              </span>
              <span className="fee-lead-rates">{money(c.current)} → {money(c.budget)}</span>
              <span className="fee-lead-pct">+{pct(c.pct, 0)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="fee-groups">
        {fees.groups.map((g) => {
          const ups = g.changes.filter((c) => direction(c) === "up").length;
          return (
            <details className="fee-group" key={g.name}>
              <summary>
                <span className="fee-group-text">
                  <span className="fee-group-name">{g.name}</span>
                  <span className="fee-group-count">
                    {count(g.changes.length, "change", "changes")}{ups !== g.changes.length ? `, ${ups} up` : ""}
                  </span>
                </span>
                <ChevronDown className="fee-group-chev" size={18} strokeWidth={2} aria-hidden="true" />
              </summary>
              <div className="fee-cols" aria-hidden="true">
                <span>Fee</span><span>{years.current} → {years.budget}</span><span>Change</span>
              </div>
              <ul className="fee-list">
                {g.changes.map((c, i) => <FeeRow key={i} c={c} meta={b.meta} />)}
              </ul>
            </details>
          );
        })}
      </div>

      {fees.unclear.length > 0 && (
        <div className="callout callout-flag">
          <h3 className="callout-title">Unclear in the city&rsquo;s schedule</h3>
          <ul className="fee-plain">
            {fees.unclear.map((u) => (
              <li key={u.fee}>
                <b>{u.fee}.</b> {u.note} (Page {printedPage(u.page, fees.source)}.)
              </li>
            ))}
          </ul>
        </div>
      )}

      {fees.source_discrepancies.length > 0 && (
        <div className="callout callout-flag">
          <h3 className="callout-title">Problems in the city&rsquo;s schedule</h3>
          <ul className="fee-plain">
            {fees.source_discrepancies.map((d, i) => (
              <li key={i}>{d.note} (Page {printedPage(d.page, fees.source)}.)</li>
            ))}
          </ul>
        </div>
      )}

      <p className="note">
        From the fee schedules on pages {pageRange} of the budget book. Wausau Pilot &amp; Review compared every
        row, {years.current} against {years.budget}, and checked each change against the printed page. Fees that
        did not change are not listed.
      </p>
    </section>
  );
}
