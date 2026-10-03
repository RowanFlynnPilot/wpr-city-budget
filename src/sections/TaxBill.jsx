import React, { useId, useMemo, useState } from "react";
import { SectionHead, Bar, ShareButton, jumpTo } from "../ui";
import { fundLabel, tifLabel, departmentShort, SHARE_URL } from "../labels";
import { useLang, useStrings } from "../i18n.jsx";
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
function levySlices(b, t) {
  const lf = b.levy_by_fund;
  const i = levyYearIndex(b, b.meta.years.budget);
  const total = lf.total[i];
  const rows = lf.funds.map((f) => ({ key: f.name, ...fundLabel(f.name, t), amount: f.values[i] }));
  rows.push({ key: "tax_increment", ...tifLabel(t), amount: lf.tax_increment[i] });
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

// Whole dollars. Anything after a decimal point is cents and is dropped, so
// "185,300.00" reads as $185,300, not $18,530,000.
const parseAssessed = (text) => Math.min(parseInt(text.split(".")[0].replace(/\D/g, "") || "0", 10), MAX_ASSESSED);

// The shared line uses the example home, never the reader's own value.
function shareText(b, t) {
  const { diff } = billFor(b, EXAMPLE_ASSESSED);
  return t("share.text", {
    dir: diff >= 0 ? "up" : "down", home: `$${EXAMPLE_ASSESSED.toLocaleString("en-US")}`,
    diff: usdCents(Math.abs(diff)), year: b.meta.years.budget,
  });
}

// The calculator, set in the banner: the first thing a reader can do.
export function BillCalculator({ b, assessed, onChange }) {
  const t = useStrings();
  const { lang } = useLang();
  const id = useId();
  const { years } = b.meta;
  const r = b.tax_rate.rate_per_1000;
  const { bill, prior, diff } = billFor(b, assessed);
  // The field keeps its own text so it can sit empty while the reader retypes;
  // the page keeps following the last value above zero.
  const [text, setText] = useState(assessed.toLocaleString("en-US"));
  const onInput = (e) => {
    const v = parseAssessed(e.target.value);
    setText(v ? v.toLocaleString("en-US") : "");
    if (v) onChange(v);
  };
  return (
    <div className="calc">
      <div className="calc-input">
        <label htmlFor={id}>{t("calc.assessedLabel")}</label>
        <div className="calc-field">
          <span aria-hidden="true">$</span>
          <input id={id} type="text" inputMode="numeric" autoComplete="off" aria-describedby={`${id}-hint`}
            placeholder={EXAMPLE_ASSESSED.toLocaleString("en-US")} value={text} onChange={onInput} />
        </div>
        <p className="calc-hint" id={`${id}-hint`}>
          {text && assessed === EXAMPLE_ASSESSED ? t("calc.example") : ""}
          {t("calc.hint")}
        </p>
      </div>
      <div className="calc-out" aria-live="polite">
        <span className="calc-label">{t("calc.yourTax", years.budget)}</span>
        {text ? (
          <>
            <span className="calc-big">{usdCents(bill)}</span>
            <p className="calc-compare">
              {t("calc.compare", { diff: signedUsdCents(diff), prior: usdCents(prior), year: years.current })}
            </p>
          </>
        ) : (
          <>
            <span className="calc-big" aria-hidden="true">&mdash;</span>
            <p className="calc-compare">{t("calc.empty")}</p>
          </>
        )}
        <p className="calc-rate">
          {t("calc.rate", {
            rate: `$${r.budget_year.toFixed(4)}`, prev: `$${r.current_year.toFixed(4)}`,
            dir: r.budget_year > r.current_year ? "up" : r.budget_year < r.current_year ? "down" : "same",
          })}
        </p>
        <div className="calc-actions">
          {text && <a className="calc-jump" href="#bill" onClick={jumpTo("bill")}>{t("calc.jump", usdCents(bill))}</a>}
          <ShareButton title={t("share.title", years.budget)} text={shareText(b, t)}
            url={lang === "en" ? SHARE_URL : `${SHARE_URL}?lang=${lang}`} />
        </div>
      </div>
    </div>
  );
}

export default function TaxBill({ b, status, assessed }) {
  const t = useStrings();
  const { years } = b.meta;
  const tr = b.tax_rate;
  const slices = useMemo(() => levySlices(b, t), [b, t]);
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
      <SectionHead title={t("bill.title", usdCents(bill))} status={status}>
        {t("bill.standfirst")}
      </SectionHead>

      <MoneyFlow bill={bill} funds={funds} departments={departments}
        billLabels={[t("calc.yourTax", years.budget), t("bill.flowShort")]}
        tipOf={{ fund: t("bill.tipFund"), dept: t("bill.tipDept") }}
        ariaLabel={t("bill.flowAria", {
          bill: usdCents(bill), rest: funds.length - 3,
          funds: funds.slice(0, 3).map((f) => ({ label: f.label, amount: usdCents(bill * f.share) })),
          depts: top.map((d) => ({ label: d.short, amount: usdCents(bill * general.share * d.share) })),
        })} />
      <p className="note flow-note">{t("bill.flowNote")}</p>

      {tr.assessed_valuation_is_estimate && (
        <p className="flagnote">{t("bill.preliminary", { year: years.budget, growth: pct(avGrowth, 2) })}</p>
      )}

      <div className="receipt">
        <h3 className="receipt-head">{t("bill.receiptTitle")}</h3>
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
          <span>{t("bill.receiptTotal", years.budget)}</span>
          <span className="rrow-amt">{usdCents(bill)}</span>
        </div>
        <p className="note">{t("bill.receiptNote", years.budget)}</p>
      </div>

      <p className="note">{t("bill.cityOnly")}</p>
    </section>
  );
}
