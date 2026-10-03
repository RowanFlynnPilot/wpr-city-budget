import React, { useMemo } from "react";
import { SectionHead, TableScroll } from "../ui";
import { StackedColumns, Legend, SERIES } from "../charts";
import { usd, pct, parseLongDate } from "../format";
import { useStrings } from "../i18n.jsx";

export default function Debt({ b, status }) {
  const t = useStrings();
  const { years } = b.meta;
  const o = b.debt.outstanding;
  const lim = b.debt.limit;
  const sched = b.debt.go_schedule;
  const ratepayer = o.water_revenue + o.sewer_revenue;
  const first = sched.years[0], last = sched.years[sched.years.length - 1];
  // How front-loaded the schedule is: principal due in the first five years.
  const soon = sched.years.slice(0, 5);
  const soonShare = (soon.reduce((s, y) => s + y.principal, 0) / sched.total_principal) * 100;

  // The legal limit as a share of equalized value, computed rather than stated.
  const eq = b.valuation.history.find((v) => v.year === years.budget);
  if (!eq) throw new Error(`valuation has no ${years.budget} row`);
  const limitShare = (lim.allowable / eq.equalized) * 100;

  const series = useMemo(() => [
    { key: "principal", label: t("debt.principal"), color: SERIES.teal },
    { key: "interest", label: t("debt.interest"), color: SERIES.ochre },
  ], [t]);

  return (
    <section id="debt" className="block">
      <SectionHead title={t("debt.title")} status={status}>
        {t("debt.standfirst", {
          total: usd(o.total), asOf: t("fmt.date", parseLongDate(o.as_of)),
          go: t("fmt.millions", o.general_obligation), rate: t("fmt.millions", ratepayer),
        })}
      </SectionHead>

      <div className="debt-cards">
        <div className="debt-card">
          <div className="debt-who">{t("debt.taxBacked")}</div>
          <div className="debt-big">{usd(o.general_obligation)}</div>
          <p>{t("debt.taxBackedNote", { undrawn: usd(o.general_obligation_undrawn), counted: usd(lim.debt_counted) })}</p>
        </div>
        <div className="debt-card debt-card-rate">
          <div className="debt-who">{t("debt.rateBacked")}</div>
          <div className="debt-big">{usd(ratepayer)}</div>
          <dl className="debt-split">
            <div><dt>{t("debt.water")}</dt><dd>{usd(o.water_revenue)}</dd></div>
            <div><dt>{t("debt.sewer")}</dt><dd>{usd(o.sewer_revenue)}</dd></div>
          </dl>
          <p>{t("debt.rateNote")}</p>
        </div>
      </div>

      <h3 className="subhead">{t("debt.limitTitle")}</h3>
      <div className="meter" role="img"
        aria-label={t("debt.meterAria", { counted: usd(lim.debt_counted), limit: usd(lim.allowable), pct: pct(lim.pct_utilized, 2) })}>
        <div className="meter-fill" style={{ width: `${lim.pct_utilized}%` }} />
      </div>
      <div className="meter-legend">
        <span>{t("debt.counted", { counted: usd(lim.debt_counted), pct: pct(lim.pct_utilized, 2) })}</span>
        <span>{t("debt.limit", usd(lim.allowable))}</span>
      </div>
      <p className="note">{t("debt.limitNote", pct(limitShare, 0))}</p>

      <h3 className="subhead">{t("debt.payTitle")}</h3>
      <p className="subnote">
        {t("debt.payNote", {
          first: first.year, last: last.year, total: usd(first.total), principal: usd(first.principal),
          interest: usd(first.interest), by: soon[soon.length - 1].year, share: pct(soonShare, 0),
        })}
      </p>
      <Legend series={series} />
      <StackedColumns rows={sched.years} series={series} totalLabel={t("debt.totalPayment")} barSize={18} step={5e6}
        height={260} ariaLabel={t("debt.chartAria", { first: first.year, last: last.year, total: usd(first.total) })} />
      <details className="table-toggle">
        <summary>{t("debt.showTable")}</summary>
        <TableScroll label={t("debt.tableAria")}>
          <table className="tbl tbl-compact">
            <thead>
              <tr><th scope="col">{t("table.year")}</th><th scope="col" className="num">{t("debt.principal")}</th><th scope="col" className="num">{t("debt.interest")}</th><th scope="col" className="num">{t("table.total")}</th></tr>
            </thead>
            <tbody>
              {sched.years.map((r) => (
                <tr key={r.year}>
                  <th scope="row">{r.year}</th>
                  <td className="num">{usd(r.principal)}</td>
                  <td className="num">{usd(r.interest)}</td>
                  <td className="num">{usd(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t("table.total")}</th>
                <td className="num">{usd(sched.total_principal)}</td>
                <td className="num">{usd(sched.total_interest)}</td>
                <td className="num">{usd(sched.total_principal + sched.total_interest)}</td>
              </tr>
            </tfoot>
          </table>
        </TableScroll>
      </details>
    </section>
  );
}
