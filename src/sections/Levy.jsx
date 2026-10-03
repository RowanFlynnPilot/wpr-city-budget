import React, { useMemo } from "react";
import { SectionHead, Change, Spark, TableScroll } from "../ui";
import { StackedColumns, Legend, SERIES } from "../charts";
import { fundLabel, tifLabel } from "../labels";
import { usd, signedUsd, pct, change } from "../format";
import { useStrings } from "../i18n.jsx";
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
  const t = useStrings();
  const lf = b.levy_by_fund;
  const { years } = b.meta;
  const iNow = levyYearIndex(b, years.budget);
  const iPrev = levyYearIndex(b, years.current);

  const series = useMemo(() => [
    { key: "general", label: fundLabel(GENERAL, t).label, color: SERIES.teal },
    { key: "debt", label: fundLabel(DEBT, t).label, color: SERIES.blue },
    { key: "tif", label: tifLabel(t).label, color: SERIES.ochre },
    { key: "other", label: t("levy.otherFunds"), color: SERIES.gray },
  ], [t]);

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
    const all = lf.funds.map((f) => ({ key: f.name, label: fundLabel(f.name, t).label, values: f.values }));
    all.push({ key: "tax_increment", label: tifLabel(t).label, values: lf.tax_increment });
    return all.sort((a, c) => c.values[iNow] - a.values[iNow]);
  }, [lf, iNow, t]);

  const first = rows[0], last = rows[iNow];
  const levyChange = lf.total[iNow] - lf.total[iPrev];
  const limit = b.levy_limit.history.find((h) => h.budget_year === years.budget);
  if (!limit) throw new Error(`levy_limit has no ${years.budget} row`);

  return (
    <section id="levy" className="block">
      <SectionHead title={t("levy.title")} status={status}>
        {t("levy.standfirst", {
          total: usd(lf.total[iNow]), year: years.budget, up: usd(levyChange),
          pct: pct(change(lf.total[iNow], lf.total[iPrev]), 2), prev: usd(lf.total[iPrev]),
          first: first.year, grown: pct(change(last.total, first.total), 0),
        })}
      </SectionHead>

      <Legend series={series} />
      <StackedColumns rows={rows} series={series} totalLabel={t("levy.totalLabel")} step={10e6} height={280}
        ariaLabel={t("levy.chartAria", { first: first.year, last: last.year, from: usd(first.total), to: usd(last.total) })} />

      <h3 className="subhead">{t("levy.tableTitle")}</h3>
      <TableScroll label={t("levy.tableTitle")}>
        <table className="tbl tbl-compact tbl-inset">
          <thead>
            <tr><th scope="col">{t("table.year")}</th><th scope="col" className="num">{t("levy.colTotal")}</th><th scope="col" className="num">{t("table.change")}</th><th scope="col" className="num">%</th></tr>
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

      <h3 className="subhead">{t("levy.fundsTitle")}</h3>
      <p className="subnote">{t("levy.fundsNote", { first: first.year, last: last.year, year: years.budget })}</p>
      <ul className="multiples">
        {fundRows.map((f) => {
          const now = f.values[iNow];
          const lastNonZero = [...lf.years].reverse().find((y, k) => f.values[f.values.length - 1 - k] > 0);
          return (
            <li className="mrow" key={f.key}>
              <span className="mrow-label">{f.label}</span>
              <Spark values={f.values} label={t("levy.sparkAria", { label: f.label, first: first.year, last: last.year })} />
              <span className="mrow-amt">{usd(now)}</span>
              <span className="mrow-chg">
                {now === 0 && lastNonZero
                  ? <span className="muted">{t("levy.noneSince", lastNonZero)}</span>
                  : <Change value={change(now, f.values[iPrev])} />}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="callout">
        <h3 className="callout-title">{t("levy.limitTitle")}</h3>
        <p>
          {t("levy.limitBody", {
            year: years.budget, allowable: usd(limit.allowable_levy),
            debt: usd(limit.debt_service_exception), actual: usd(limit.actual_levy),
          })}
        </p>
      </div>
    </section>
  );
}
