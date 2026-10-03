import React, { useMemo, useState } from "react";
import { SectionHead, Change, Bar } from "../ui";
import { OTHER_GENERAL_GOVERNMENT, administratorCost } from "../labels";
import { usd, pct, change } from "../format";
import { useStrings } from "../i18n.jsx";

export const GENERAL_FUND = "General Fund";

export default function GeneralFund({ b, status }) {
  const t = useStrings();
  const [view, setView] = useState("spending");
  const { years } = b.meta;
  const gf = b.general_fund;

  // Spending by department lives in `units`, not in general_fund (contract).
  const spending = useMemo(() => b.units
    .filter((u) => u.fund_group === GENERAL_FUND)
    .map((u) => ({
      key: u.name, name: u.name, amount: u.total_expenses.proposed,
      then: u.total_expenses.current_adopted,
      note: u.name === OTHER_GENERAL_GOVERNMENT ? t("ogg.note", usd(administratorCost(u))) : null,
    }))
    .sort((a, c) => c.amount - a.amount), [b.units, t]);

  const revenues = useMemo(() => gf.revenues
    .map((r) => ({ key: r.name, name: r.name, amount: r.budget, then: r.current_adopted, note: null }))
    .sort((a, c) => c.amount - a.amount), [gf.revenues]);

  const rows = view === "spending" ? spending : revenues;
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const max = rows[0].amount;
  const spend = gf.total_expenditures.budget;
  const revenue = gf.total_revenues.budget;
  const propertyTax = gf.revenues.find((r) => r.name === "General Property Taxes");
  if (!propertyTax) throw new Error("general_fund.revenues has no General Property Taxes row");

  return (
    <section id="general-fund" className="block">
      <SectionHead title={t("gf.title")} status={status}>
        {t("gf.standfirst", { tax: usd(propertyTax.budget), share: pct((propertyTax.budget / revenue) * 100, 0) })}
      </SectionHead>

      <dl className="trio">
        <div><dt>{t("gf.spending")}</dt><dd>{usd(spend)}</dd><dd className="trio-sub"><Change value={change(spend, gf.total_expenditures.current_adopted)} /> {t("gf.from", years.current)}</dd></div>
        <div><dt>{t("gf.revenue")}</dt><dd>{usd(revenue)}</dd><dd className="trio-sub"><Change value={change(revenue, gf.total_revenues.current_adopted)} /> {t("gf.from", years.current)}</dd></div>
        <div><dt>{t("gf.gap")}</dt><dd>{usd(spend - revenue)}</dd><dd className="trio-sub">{t("gf.gapNote")}</dd></div>
      </dl>

      <div className="seg" role="group" aria-label={t("gf.viewAria")}>
        <button type="button" aria-pressed={view === "spending"} onClick={() => setView("spending")}>{t("gf.spending")}</button>
        <button type="button" aria-pressed={view === "revenue"} onClick={() => setView("revenue")}>{t("gf.revenue")}</button>
      </div>

      <div className="ranked-head" aria-hidden="true">
        <span>{view === "spending" ? t("gf.colDept") : t("gf.colSource")}</span>
        <span>{t("gf.colProposed", years.budget)}</span>
        <span>{t("gf.colShare")}</span>
        <span>{t("gf.colVs", years.current)}</span>
      </div>
      <ol className="ranked">
        {rows.map((r) => (
          <li key={r.key} className={"rank" + (r.note ? " rank-flag" : "")}>
            <span className="rank-name" lang="en">{r.name}{r.note && <sup aria-hidden="true">*</sup>}</span>
            <Bar value={r.amount} max={max} />
            <span className="rank-amt">{usd(r.amount)}</span>
            <span className="rank-share">{pct((r.amount / total) * 100)}</span>
            <span className="rank-chg"><Change value={change(r.amount, r.then)} /></span>
            {r.note && <p className="rank-note"><span aria-hidden="true">* </span>{r.note}</p>}
          </li>
        ))}
      </ol>
      <p className="note">
        {view === "spending"
          ? t("gf.noteSpending", { year: years.budget, prev: years.current })
          : t("gf.noteRevenue", { year: years.budget, prev: years.current })}
      </p>
    </section>
  );
}
