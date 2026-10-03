import React from "react";
import { HistoryChart, HISTORY } from "../charts";
import { TableScroll } from "../ui";
import { printedPage } from "../labels";
import { usd, curly } from "../format";
import { useStrings } from "../i18n.jsx";

// One unit's 10 years of budget and actual spending, measured from the city's
// chart (history.json), with the coming year's proposal (budget.json) for scale.
// The history's own notes are hand-written English, as in the data file.
export default function UnitHistory({ u, h, meta, offset }) {
  const t = useStrings();
  // Measured figures are approximate: say so in the wording, not with false precision.
  const about = (v) => (v >= 1e6 ? t("fmt.aboutMillions", v) : usd(v));
  const { years } = meta;
  const rows = h.years.map((year, i) => ({ year, budget: h.budget[i], actual: h.actual[i] }));
  const first = h.years[0], last = h.years[h.years.length - 1];
  const c = h.check;
  const check = c && { year: c.year, measured: about(c.measured), table: usd(c.table) };
  return (
    <div className="history">
      <h4 className="history-title">{t("hist.title", { first, last })}</h4>
      <ul className="legend legend-small">
        <li><i className="legend-sw" style={{ background: HISTORY.budget }} aria-hidden="true" />{t("hist.budget")}</li>
        <li><i className="legend-line" style={{ background: HISTORY.actual }} aria-hidden="true" />{t("hist.actual")}</li>
        <li><i className="legend-dash" style={{ borderColor: HISTORY.proposed }} aria-hidden="true" />{t("hist.proposed", years.budget)}</li>
      </ul>
      <HistoryChart rows={rows} proposed={u.total_expenses.proposed}
        labels={{ budget: t("hist.tipBudget"), actual: t("hist.tipActual"), none: t("hist.none") }}
        ariaLabel={t("hist.aria", { name: u.name, first, last, year: years.budget, proposed: usd(u.total_expenses.proposed) })} />
      <p className="history-note">
        {t("hist.approx", printedPage(h.page, { printed_page_offset: offset }))}
        {check && !h.note && t("hist.check", check)}
      </p>
      {h.note && (
        <p className="history-flag">
          {check && t("hist.flagCheck", check)}
          <span lang="en">{curly(h.note)}</span>
        </p>
      )}
      <details className="table-toggle">
        <summary>{t("hist.showTable")}</summary>
        <TableScroll label={t("hist.tableAria", u.name)}>
          <table className="tbl tbl-compact">
            <thead>
              <tr><th scope="col">{t("table.year")}</th><th scope="col" className="num">{t("hist.colBudget")}</th><th scope="col" className="num">{t("hist.colActual")}</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year}>
                  <th scope="row">{r.year}</th>
                  <td className="num">{r.budget === null ? t("hist.none") : usd(r.budget)}</td>
                  <td className="num">{usd(r.actual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </details>
    </div>
  );
}
