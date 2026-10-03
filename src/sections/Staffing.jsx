import React from "react";
import { SectionHead, Change, Spark } from "../ui";
import { fte } from "../format";

// The council's row is filled in only for the oldest year (rule 9), which
// makes that year's total not comparable with the rest.
const COUNCIL = "City Council";

export default function Staffing({ b, status }) {
  const { years } = b.meta;
  const st = b.staffing;
  const iNow = st.years.indexOf(years.budget);
  const iPrev = st.years.indexOf(years.current);
  if (iNow < 0 || iPrev < 0) throw new Error("staffing is missing the budget or current year");
  const iOld = st.years.length - 1;
  const oldest = st.years[iOld];
  const council = st.departments.find((d) => d.name === COUNCIL);
  if (!council) throw new Error(`staffing has no "${COUNCIL}" row`);

  // Oldest first for the charts (the source runs newest first).
  const asc = (vals) => [...vals].reverse();
  const totalsAsc = asc(st.total);
  const yearsAsc = asc(st.years);
  const max = Math.max(...st.total);
  const depts = [...st.departments].sort((a, c) => (c.values[iNow] ?? -1) - (a.values[iNow] ?? -1));

  return (
    <section id="staffing" className="block">
      <SectionHead title="How many people the city employs" status={status}>
        The proposed budget funds {fte(st.total[iNow])} full-time-equivalent positions
        in {years.budget}, compared with {fte(st.total[iPrev])} in {years.current}.
      </SectionHead>

      <div className="cols" role="img"
        aria-label={`Column chart of total full-time-equivalent positions by year, ${oldest} to ${years.budget}.`}>
        {yearsAsc.map((y, i) => (
          <div className={"col" + (y === oldest ? " col-caveat" : "") + (y === years.budget ? " col-now" : "")} key={y}>
            <span className="col-val">{fte(totalsAsc[i])}{y === oldest && <sup>*</sup>}</span>
            <span className="col-track"><span className="col-bar" style={{ height: `${(totalsAsc[i] / max) * 100}%` }} /></span>
            <span className="col-year">{y}</span>
          </div>
        ))}
      </div>
      <p className="note">
        * {oldest} is not comparable with later years: it is the only year that counts
        the {council.values[iOld]} council members.
      </p>

      <h3 className="subhead">By department</h3>
      <p className="subnote">Bars show {oldest} to {years.budget}, each row on its own scale. Blank years are blank in the city&rsquo;s table.</p>
      <ul className="multiples">
        {depts.map((d) => {
          const now = d.values[iNow], prev = d.values[iPrev];
          const onlyOldest = d.values.every((v, k) => (k === iOld ? v !== null : v === null));
          return (
            <li className="mrow" key={d.name}>
              <span className="mrow-label">{d.name}</span>
              <Spark values={asc(d.values)} label={`${d.name} positions, ${oldest} to ${years.budget}`} />
              <span className="mrow-amt">{now === null ? "—" : fte(now)}</span>
              <span className="mrow-chg">
                {now === null
                  ? <span className="muted">{onlyOldest ? `only in ${oldest}` : "not listed"}</span>
                  : <Change value={prev === null ? null : now === prev ? 0 : now - prev} kind="fte" />}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
