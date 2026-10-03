import React, { useMemo } from "react";
import { SectionHead, Change, Spark, TableScroll } from "../ui";
import { StackedColumns, Legend, SERIES } from "../charts";
import { fundLabel, TIF } from "../labels";
import { usd, signedUsd, pct, change } from "../format";
import { levyYearIndex } from "./TaxBill";

// The two funds the chart breaks out by name; everything else folds into
// "All other funds" (the chart has four series, the rows below show every fund).
const GENERAL = "General Fund";
const DEBT = "Debt Service Fund";

function fundByName(lf, name) {
  const f = lf.funds.find((x) => x.name === name);
  if (!f) throw new Error(`levy_by_fund has no "${name}"`);
  return f;
}

export default function Levy({ b, status }) {
  const lf = b.levy_by_fund;
  const { years } = b.meta;
  const iNow = levyYearIndex(b, years.budget);
  const iPrev = levyYearIndex(b, years.current);

  const series = useMemo(() => [
    { key: "general", label: fundLabel(GENERAL).label, color: SERIES.teal },
    { key: "debt", label: fundLabel(DEBT).label, color: SERIES.blue },
    { key: "tif", label: TIF.label, color: SERIES.ochre },
    { key: "other", label: "All other funds", color: SERIES.gray },
  ], []);

  const rows = useMemo(() => {
    const general = fundByName(lf, GENERAL), debt = fundByName(lf, DEBT);
    return lf.years.map((year, i) => ({
      year,
      total: lf.total[i],
      general: general.values[i],
      debt: debt.values[i],
      tif: lf.tax_increment[i],
      other: lf.total[i] - general.values[i] - debt.values[i] - lf.tax_increment[i],
    }));
  }, [lf]);

  // Every fund (plus tax increment) as its own row: a 10-year sparkline on its
  // own scale, the budget-year amount, and the change from the current year.
  const fundRows = useMemo(() => {
    const all = lf.funds.map((f) => ({ key: f.name, label: fundLabel(f.name).label, values: f.values }));
    all.push({ key: "tax_increment", label: TIF.label, values: lf.tax_increment });
    return all.sort((a, c) => c.values[iNow] - a.values[iNow]);
  }, [lf, iNow]);

  const first = rows[0], last = rows[iNow];
  const levyChange = lf.total[iNow] - lf.total[iPrev];
  const limit = b.levy_limit.history.find((h) => h.budget_year === years.budget);
  if (!limit) throw new Error(`levy_limit has no ${years.budget} row`);

  return (
    <section id="levy" className="block">
      <SectionHead title="Where the levy goes, year by year" status={status}>
        The city plans to collect {usd(lf.total[iNow])} in property taxes for {years.budget},
        up {usd(levyChange)} ({pct(change(lf.total[iNow], lf.total[iPrev]), 2)}) from {usd(lf.total[iPrev])}.
        Since {first.year} the levy has grown {pct(change(last.total, first.total), 0)}.
      </SectionHead>

      <Legend series={series} />
      <StackedColumns rows={rows} series={series} totalLabel="Total levy" step={10e6}
        ariaLabel={`Stacked column chart of the city property tax levy by year, ${first.year} to ${last.year}, rising from ${usd(first.total)} to ${usd(last.total)}. The same figures are in the table below.`} />

      <h3 className="subhead">Total levy by year</h3>
      <TableScroll label="Total levy by year">
        <table className="tbl tbl-compact">
          <thead>
            <tr><th scope="col">Year</th><th scope="col" className="num">Total levy</th><th scope="col" className="num">Change</th><th scope="col" className="num">%</th></tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => {
              const prev = rows.find((x) => x.year === r.year - 1);
              return (
                <tr key={r.year} className={r.year === years.budget ? "row-now" : ""}>
                  <th scope="row">{r.year}</th>
                  <td className="num">{usd(r.total)}</td>
                  <td className="num">{prev ? signedUsd(r.total - prev.total) : "—"}</td>
                  <td className="num">{prev ? <Change value={change(r.total, prev.total)} digits={2} /> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>

      <h3 className="subhead">Every fund the levy pays for</h3>
      <p className="subnote">
        Bars show {first.year} to {last.year}, each row on its own scale. The amount is the {years.budget} levy.
      </p>
      <ul className="multiples">
        {fundRows.map((f) => {
          const now = f.values[iNow];
          const lastNonZero = [...lf.years].reverse().find((y, k) => f.values[f.values.length - 1 - k] > 0);
          return (
            <li className="mrow" key={f.key}>
              <span className="mrow-label">{f.label}</span>
              <Spark values={f.values} label={`${f.label}, ${first.year} to ${last.year}`} />
              <span className="mrow-amt">{usd(now)}</span>
              <span className="mrow-chg">
                {now === 0 && lastNonZero
                  ? <span className="muted">none since {lastNonZero}</span>
                  : <Change value={change(now, f.values[iPrev])} />}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="callout">
        <h3 className="callout-title">The state limit, and what it leaves out</h3>
        <p>
          Wisconsin caps how much a city&rsquo;s levy can grow, but payments on borrowed money are
          exempt. For {years.budget}, the limit allows {usd(limit.allowable_levy)}, plus{" "}
          {usd(limit.debt_service_exception)} for debt payments. The proposed levy, not counting
          tax increment districts, is {usd(limit.actual_levy)}.
        </p>
      </div>
    </section>
  );
}
