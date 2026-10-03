import React, { useMemo } from "react";
import { SectionHead, TableScroll } from "../ui";
import { StackedColumns, Legend, SERIES } from "../charts";
import { usd, millions, pct, apDate } from "../format";

export default function Debt({ b, status }) {
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
    { key: "principal", label: "Principal", color: SERIES.teal },
    { key: "interest", label: "Interest", color: SERIES.ochre },
  ], []);

  return (
    <section id="debt" className="block">
      <SectionHead title="What the city owes, and who repays it" status={status}>
        The city owed {usd(o.total)} as of {apDate(o.as_of)}. Property taxpayers back {millions(o.general_obligation)} of
        it; water and sewer customers repay the other {millions(ratepayer)} through their utility rates.
      </SectionHead>

      <div className="debt-cards">
        <div className="debt-card">
          <div className="debt-who">Backed by property taxes</div>
          <div className="debt-big">{usd(o.general_obligation)}</div>
          <p>
            General obligation debt drawn so far. Counting {usd(o.general_obligation_undrawn)} in
            state loans approved but not yet drawn, {usd(lim.debt_counted)} counts against the
            city&rsquo;s legal borrowing limit.
          </p>
        </div>
        <div className="debt-card debt-card-rate">
          <div className="debt-who">Repaid by water and sewer customers</div>
          <div className="debt-big">{usd(ratepayer)}</div>
          <dl className="debt-split">
            <div><dt>Water utility</dt><dd>{usd(o.water_revenue)}</dd></div>
            <div><dt>Sewer utility</dt><dd>{usd(o.sewer_revenue)}</dd></div>
          </dl>
          <p>Revenue debt, repaid from utility bills rather than the property tax.</p>
        </div>
      </div>

      <h3 className="subhead">The legal limit</h3>
      <div className="meter" role="img"
        aria-label={`${usd(lim.debt_counted)} of a ${usd(lim.allowable)} limit, ${pct(lim.pct_utilized, 2)} used`}>
        <div className="meter-fill" style={{ width: `${lim.pct_utilized}%` }} />
      </div>
      <div className="meter-legend">
        <span><b>{usd(lim.debt_counted)}</b> counted ({pct(lim.pct_utilized, 2)})</span>
        <span>Limit <b>{usd(lim.allowable)}</b></span>
      </div>
      <p className="note">
        State law caps a city&rsquo;s general obligation debt at {pct(limitShare, 0)} of its equalized
        property value. Water and sewer revenue debt does not count toward the limit.
      </p>

      <h3 className="subhead">Paying it back</h3>
      <p className="subnote">
        Scheduled payments on general obligation debt, {first.year} to {last.year}. In {first.year} the
        city pays {usd(first.total)}: {usd(first.principal)} in principal and {usd(first.interest)} in interest.
        {" "}By {soon[soon.length - 1].year} the city is scheduled to repay {pct(soonShare, 0)} of the principal.
      </p>
      <Legend series={series} />
      <StackedColumns rows={sched.years} series={series} totalLabel="Total payment" barSize={18} step={5e6}
        height={260}
        ariaLabel={`Stacked column chart of scheduled general obligation debt payments from ${first.year} to ${last.year}, falling from ${usd(first.total)} in ${first.year}. The same figures are in the table below.`} />
      <details className="table-toggle">
        <summary>Show the repayment schedule as a table</summary>
        <TableScroll label="Repayment schedule">
          <table className="tbl tbl-compact">
            <thead>
              <tr><th scope="col">Year</th><th scope="col" className="num">Principal</th><th scope="col" className="num">Interest</th><th scope="col" className="num">Total</th></tr>
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
                <th scope="row">Total</th>
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
