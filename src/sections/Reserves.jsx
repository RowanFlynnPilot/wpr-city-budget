import React from "react";
import { SectionHead, TableScroll } from "../ui";
import { HISTORY, SERIES } from "../charts";
import { printedPage } from "../labels";
import { usd, pct, shortUsd } from "../format";
import { useStrings } from "../i18n.jsx";

// A column per year, the newest marked, with an optional dashed goal line drawn
// across every column at the same height. Value labels show for the first and
// newest year on phones, every year wider.
function Columns({ items, max, label, fmt, goal, tone }) {
  return (
    <div className={"cols" + (tone ? ` cols-${tone}` : "")} role="img" aria-label={label}>
      {items.map((it, i) => (
        <div className={"col" + (i === 0 ? " col-first" : "") + (i === items.length - 1 ? " col-now" : "")} key={it.year}>
          <span className="col-val">{fmt(it.value)}</span>
          <span className="col-track">
            {goal !== undefined && <span className="col-goal" style={{ bottom: `${(goal / max) * 100}%` }} />}
            <span className="col-bar" style={{ height: `${(it.value / max) * 100}%` }} />
          </span>
          <span className="col-year">{it.year}</span>
        </div>
      ))}
    </div>
  );
}

// The general fund's unassigned reserves against the city's policy goal, and
// the Motor Pool Fund's working capital (fund_balance and motor_pool in
// budget.json). The city measures each year-end balance against the budget two
// years later; the extractor checks that pairing against this book.
export default function Reserves({ b, status }) {
  const t = useStrings();
  const { meta } = b;
  const fb = b.fund_balance;
  const mp = b.motor_pool;
  const last = fb.years[fb.years.length - 1];
  const goal = pct(fb.policy_percent, 2);
  const shareMax = Math.max(fb.policy_percent, ...fb.years.map((y) => y.percent));
  const wcLast = mp.history[mp.history.length - 1];
  const wcPeak = mp.history.reduce((a, h) => (h.working_capital > a.working_capital ? h : a));

  return (
    <section id="reserves" className="block">
      <SectionHead title={t("res.title")} status={status}>
        {t("res.standfirst", { year: last.year, balance: usd(last.unassigned), share: pct(last.percent, 2), budgetYear: meta.years.budget, goal })}
      </SectionHead>

      <h3 className="subhead">{t("res.balanceTitle", { first: fb.years[0].year, last: last.year })}</h3>
      <ul className="legend legend-small">
        <li><i className="legend-sw" style={{ background: SERIES.teal }} aria-hidden="true" />{t("res.legendBalance")}</li>
        <li><i className="legend-dash" style={{ borderColor: HISTORY.proposed }} aria-hidden="true" />{t("res.legendGoal", goal)}</li>
      </ul>
      <Columns items={fb.years.map((y) => ({ year: y.year, value: y.percent }))} max={shareMax} goal={fb.policy_percent}
        fmt={(v) => pct(v, 1)}
        label={t("res.balanceAria", { first: fb.years[0].year, last: last.year, from: pct(fb.years[0].percent, 2), to: pct(last.percent, 2), goal })} />
      <p className="note">{t("res.pairing", { year: last.year, budgetYear: meta.years.budget, page: printedPage(fb.page, meta) })}</p>
      <details className="table-toggle">
        <summary>{t("res.showTable")}</summary>
        <TableScroll label={t("res.balanceTitle", { first: fb.years[0].year, last: last.year })}>
          <table className="tbl tbl-compact">
            <thead>
              <tr><th scope="col">{t("table.year")}</th><th scope="col" className="num">{t("res.colBalance")}</th><th scope="col" className="num">{t("res.colBudget")}</th><th scope="col" className="num">{t("res.colShare")}</th></tr>
            </thead>
            <tbody>
              {fb.years.map((y) => (
                <tr key={y.year}>
                  <th scope="row">{y.year}</th>
                  <td className="num">{usd(y.unassigned)}</td>
                  <td className="num">{usd(y.budget_expenses)}</td>
                  <td className="num">{pct(y.percent, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </details>

      <h3 className="subhead">{t("res.fleetTitle")}</h3>
      <p className="subnote">
        {t("res.fleetNote", { last: usd(wcLast.working_capital), lastYear: wcLast.year, peak: usd(wcPeak.working_capital), peakYear: wcPeak.year, first: mp.history[0].year })}
      </p>
      <Columns items={mp.history.map((h) => ({ year: h.year, value: h.working_capital }))} max={wcPeak.working_capital} tone="gray"
        fmt={shortUsd} label={t("res.fleetAria", { first: mp.history[0].year, last: wcLast.year })} />
      <blockquote className="quote">
        <p>&ldquo;{mp.overview_note.text}&rdquo;</p>
        <footer>{t("res.quoteSource", printedPage(mp.overview_note.page, meta))}</footer>
      </blockquote>
      <details className="table-toggle">
        <summary>{t("res.showTable")}</summary>
        <TableScroll label={t("res.fleetTitle")}>
          <table className="tbl tbl-compact">
            <thead>
              <tr><th scope="col">{t("table.year")}</th><th scope="col" className="num">{t("res.colWorking")}</th></tr>
            </thead>
            <tbody>
              {mp.history.map((h) => (
                <tr key={h.year}><th scope="row">{h.year}</th><td className="num">{usd(h.working_capital)}</td></tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </details>
    </section>
  );
}
