import React, { useId, useMemo, useState } from "react";
import { SectionHead, Bar } from "../ui";
import { fundLabel, TIF } from "../labels";
import { usdCents, signedUsdCents, pct, change, taxAt } from "../format";

// The example the calculator opens with (CLAUDE.md v1 spec). An input default,
// labeled as an example on screen; not a budget figure.
const EXAMPLE_ASSESSED = 200000;
const MAX_ASSESSED = 99999999;

// Index of a year in levy_by_fund.years; a missing year stops the page.
export function levyYearIndex(b, year) {
  const i = b.levy_by_fund.years.indexOf(year);
  if (i < 0) throw new Error(`levy_by_fund has no ${year} column`);
  return i;
}

// The budget year's levy split into slices: each fund plus tax increment, as
// shares of the FULL levy (rule 1). Shares of the subtotal would not add up to
// the bill, because the rate is the full levy over assessed value.
function levySlices(b) {
  const lf = b.levy_by_fund;
  const i = levyYearIndex(b, b.meta.years.budget);
  const total = lf.total[i];
  const rows = lf.funds.map((f) => ({ key: f.name, ...fundLabel(f.name), amount: f.values[i] }));
  rows.push({ key: "tax_increment", ...TIF, amount: lf.tax_increment[i] });
  return rows
    .filter((r) => r.amount > 0)
    .map((r) => ({ ...r, share: r.amount / total }))
    .sort((a, c) => c.amount - a.amount);
}

export default function TaxBill({ b, status }) {
  const id = useId();
  const [assessed, setAssessed] = useState(EXAMPLE_ASSESSED);
  const { years } = b.meta;
  const tr = b.tax_rate;
  const slices = useMemo(() => levySlices(b), [b]);

  const bill = taxAt(assessed, tr.rate_per_1000.budget_year);
  const prior = taxAt(assessed, tr.rate_per_1000.current_year);
  const diff = Math.round((bill - prior) * 100) / 100;
  const maxShare = slices[0].share;
  const avGrowth = change(tr.assessed_valuation.budget_year, tr.assessed_valuation.current_year);

  const onInput = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    setAssessed(Math.min(parseInt(digits || "0", 10), MAX_ASSESSED));
  };

  return (
    <section id="bill" className="block block-hero">
      <SectionHead kicker="Your city tax bill" title={`What the city’s ${years.budget} budget means for your bill`} status={status}>
        Enter your property&rsquo;s assessed value to see the city&rsquo;s share of your tax bill
        and what each part of the levy pays for.
      </SectionHead>

      <div className="calc">
        <div className="calc-input">
          <label htmlFor={id}>Assessed value of your property</label>
          <div className="calc-field">
            <span aria-hidden="true">$</span>
            <input id={id} type="text" inputMode="numeric" autoComplete="off"
              aria-describedby={`${id}-hint`}
              value={assessed.toLocaleString("en-US")} onChange={onInput} />
          </div>
          <p className="calc-hint" id={`${id}-hint`}>
            {assessed === EXAMPLE_ASSESSED ? "This is an example. " : ""}
            Use the assessed value printed on your tax bill, not the market value.
          </p>
        </div>

        <div className="calc-out" aria-live="polite">
          <div className="calc-main">
            <span className="calc-label">Your {years.budget} city tax</span>
            <span className="calc-big">{usdCents(bill)}</span>
          </div>
          <div className="calc-compare">
            <div>
              <span className="calc-label">{years.current} city tax</span>
              <span className="calc-mid">{usdCents(prior)}</span>
            </div>
            <div>
              <span className="calc-label">Difference</span>
              <span className="calc-mid">{signedUsdCents(diff)}</span>
            </div>
          </div>
          <p className="calc-rate">
            Rate: ${tr.rate_per_1000.budget_year.toFixed(4)} per $1,000 of assessed value
            in {years.budget}, ${tr.rate_per_1000.current_year.toFixed(4)} in {years.current}.
          </p>
        </div>
      </div>

      {tr.assessed_valuation_is_estimate && (
        <p className="flagnote">
          <b>The {years.budget} rate is preliminary.</b> It rests on the city&rsquo;s placeholder
          for {years.budget} assessed value (last year&rsquo;s plus {pct(avGrowth, 2)}), which
          will change when the state publishes final figures.
        </p>
      )}

      <div className="receipt">
        <h3 className="receipt-head">Where your {usdCents(bill)} goes</h3>
        <ol className="receipt-rows">
          {slices.map((s) => (
            <li className="rrow" key={s.key}>
              <div className="rrow-text">
                <span className="rrow-label">{s.label}</span>
                <span className="rrow-desc">{s.desc}</span>
              </div>
              <span className="rrow-amt">{usdCents(Math.round(bill * s.share * 100) / 100)}</span>
              <Bar value={s.share} max={maxShare} />
              <span className="rrow-share">{pct(s.share * 100)}</span>
            </li>
          ))}
        </ol>
        <div className="receipt-total">
          <span>City share of your {years.budget} bill</span>
          <span className="rrow-amt">{usdCents(bill)}</span>
        </div>
        <p className="note">
          Each part is that fund&rsquo;s share of the full {years.budget} city levy, including
          tax increment districts. Parts are rounded to the cent, so they can differ from the
          total by a few cents.
        </p>
      </div>

      <p className="note">
        <b>This is only the city&rsquo;s part of your bill.</b> Your full property tax bill also
        includes Marathon County, your school district and the technical college, whose rates
        are set in mid-November. Both years use the same assessed value; if your assessment
        changed, your actual change will differ.
      </p>
    </section>
  );
}
