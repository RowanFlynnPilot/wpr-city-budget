import React, { useId, useMemo } from "react";
import { SectionHead, Bar } from "../ui";
import { fundLabel, departmentShort, TIF } from "../labels";
import { usdCents, signedUsdCents, pct, change, taxAt } from "../format";
import MoneyFlow from "../MoneyFlow";
import { GENERAL_FUND } from "./GeneralFund";

// The example the calculator opens with (CLAUDE.md v1 spec). An input default,
// labeled as an example on screen; not a budget figure.
export const EXAMPLE_ASSESSED = 200000;
const MAX_ASSESSED = 99999999;

// Money-flow colors: the darker brand teal carries white text at 6.7:1; debt
// blue and the neutral gray carry white text; ochre carries ink.
const FLOW = { general: "#2B655D", debt: "#2E5C9A", tif: "#C9922E", other: "#77706A" };

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

const billFor = (b, assessed) => {
  const r = b.tax_rate.rate_per_1000;
  const bill = taxAt(assessed, r.budget_year);
  const prior = taxAt(assessed, r.current_year);
  return { bill, prior, diff: Math.round((bill - prior) * 100) / 100 };
};

// The calculator, set in the banner: the first thing a reader can do.
export function BillCalculator({ b, assessed, onChange }) {
  const id = useId();
  const { years } = b.meta;
  const r = b.tax_rate.rate_per_1000;
  const { bill, prior, diff } = billFor(b, assessed);
  const onInput = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    onChange(Math.min(parseInt(digits || "0", 10), MAX_ASSESSED));
  };
  return (
    <div className="calc">
      <div className="calc-input">
        <label htmlFor={id}>Assessed value of your property</label>
        <div className="calc-field">
          <span aria-hidden="true">$</span>
          <input id={id} type="text" inputMode="numeric" autoComplete="off" aria-describedby={`${id}-hint`}
            value={assessed.toLocaleString("en-US")} onChange={onInput} />
        </div>
        <p className="calc-hint" id={`${id}-hint`}>
          {assessed === EXAMPLE_ASSESSED ? "This is an example. " : ""}
          Use the assessed value on your tax bill, not the market value.
        </p>
      </div>
      <div className="calc-out" aria-live="polite">
        <span className="calc-label">Your {years.budget} city tax</span>
        <span className="calc-big">{usdCents(bill)}</span>
        <p className="calc-compare">
          <span className="calc-diff">{signedUsdCents(diff)}</span> from {usdCents(prior)} in {years.current}
        </p>
        <p className="calc-rate">
          ${r.budget_year.toFixed(4)} per $1,000 of assessed value, up from ${r.current_year.toFixed(4)}.
        </p>
      </div>
    </div>
  );
}

export default function TaxBill({ b, status, assessed }) {
  const { years } = b.meta;
  const tr = b.tax_rate;
  const slices = useMemo(() => levySlices(b), [b]);
  const { bill } = billFor(b, assessed);
  const maxShare = slices[0].share;
  const avGrowth = change(tr.assessed_valuation.budget_year, tr.assessed_valuation.current_year);

  // Flow inputs. Funds keep their levy shares; general fund departments split
  // the day-to-day share by their share of general fund spending.
  const funds = useMemo(() => slices.map((s) => ({
    ...s,
    general: s.key === "General Fund",
    color: s.key === "General Fund" ? FLOW.general : s.key === "Debt Service Fund" ? FLOW.debt
      : s.key === "tax_increment" ? FLOW.tif : FLOW.other,
    ink: s.key === "tax_increment",
  })), [slices]);
  const departments = useMemo(() => {
    const gf = b.units.filter((u) => u.fund_group === GENERAL_FUND);
    const total = gf.reduce((s, u) => s + u.total_expenses.proposed, 0);
    return gf.map((u) => ({ key: u.name, label: u.name, short: departmentShort(u.name), share: u.total_expenses.proposed / total }))
      .sort((a, c) => c.share - a.share);
  }, [b.units]);
  const general = funds.find((f) => f.general);
  const top = departments.slice(0, 3);

  return (
    <section id="bill" className="block block-hero">
      <SectionHead title={`Follow your ${usdCents(bill)}`} status={status}>
        Your city tax, to scale: first the funds it pays for, then how day-to-day services split it
        among departments. Hover or tap a block for its share.
      </SectionHead>

      <MoneyFlow bill={bill} funds={funds} departments={departments} billLabel={`Your ${years.budget} city tax`}
        ariaLabel={`Your ${usdCents(bill)} city tax: ${funds.slice(0, 3).map((f) => `${usdCents(bill * f.share)} to ${f.label.toLowerCase()}`).join(", ")}, and the rest to ${funds.length - 3} smaller funds. Of day-to-day services, ${top.map((d) => `${d.short.toLowerCase()} ${usdCents(bill * general.share * d.share)}`).join(", ")}. Every amount is listed below.`} />
      <p className="note flow-note">
        The bottom row splits day-to-day services by each department&rsquo;s share of general fund spending. The
        city pools property taxes with state aid and fees; it does not assign tax dollars to departments.
      </p>

      {tr.assessed_valuation_is_estimate && (
        <p className="flagnote">
          <b>The {years.budget} rate is preliminary.</b> It rests on the city&rsquo;s placeholder
          for {years.budget} assessed value (last year&rsquo;s plus {pct(avGrowth, 2)}), which
          will change when the state publishes final figures.
        </p>
      )}

      <div className="receipt">
        <h3 className="receipt-head">Every line of your city tax</h3>
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
          Each line is that fund&rsquo;s share of the full {years.budget} city levy, including tax increment
          districts. Lines are rounded to the cent, so they can differ from the total by a few cents.
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
