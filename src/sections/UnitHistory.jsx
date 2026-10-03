import React from "react";
import { HistoryChart, HISTORY } from "../charts";
import { TableScroll } from "../ui";
import { printedPage } from "../labels";
import { usd } from "../format";

// Measured figures are approximate: say so in the wording, not with false precision.
const about = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)} million` : usd(v));

// One unit's ten years of budget and actual spending, measured from the city's
// chart (history.json), with the coming year's proposal (budget.json) for scale.
export default function UnitHistory({ u, h, meta, offset }) {
  const { years } = meta;
  const rows = h.years.map((year, i) => ({ year, budget: h.budget[i], actual: h.actual[i] }));
  const first = h.years[0], last = h.years[h.years.length - 1];
  const c = h.check;
  return (
    <div className="history">
      <h4 className="history-title">Budget and actual spending, <span className="nowrap">{first}&ndash;{last}</span></h4>
      <ul className="legend legend-small">
        <li><i className="legend-sw" style={{ background: HISTORY.budget }} aria-hidden="true" />Budget, as amended</li>
        <li><i className="legend-line" style={{ background: HISTORY.actual }} aria-hidden="true" />Actual spending</li>
        <li><i className="legend-dash" style={{ borderColor: HISTORY.proposed }} aria-hidden="true" />{years.budget} proposed</li>
      </ul>
      <HistoryChart rows={rows} proposed={u.total_expenses.proposed}
        ariaLabel={`${u.name}: budget and actual spending, ${first} to ${last}, measured from the city's chart, with the ${years.budget} proposal of ${usd(u.total_expenses.proposed)}. The same figures are in the table below the chart.`} />
      <p className="history-note">
        Approximate: measured from the city&rsquo;s chart on page {printedPage(h.page, { printed_page_offset: offset })} of
        the budget book.
        {c && !h.note && <> As a check, its {c.year} actual measures about {about(c.measured)}; the city&rsquo;s budget table says {usd(c.table)}.</>}
      </p>
      {h.note && (
        <p className="history-flag">
          {c && <>The chart&rsquo;s {c.year} actual measures about {about(c.measured)}; the city&rsquo;s budget table says {usd(c.table)}. </>}
          {h.note}
        </p>
      )}
      <details className="table-toggle">
        <summary>Show as a table</summary>
        <TableScroll label={`${u.name} budget and actual spending by year`}>
          <table className="tbl tbl-compact">
            <thead>
              <tr><th scope="col">Year</th><th scope="col" className="num">Budget (approx.)</th><th scope="col" className="num">Actual (approx.)</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year}>
                  <th scope="row">{r.year}</th>
                  <td className="num">{r.budget === null ? "none" : usd(r.budget)}</td>
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
