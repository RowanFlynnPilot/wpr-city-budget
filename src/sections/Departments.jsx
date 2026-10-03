import React, { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHead, Change, TableScroll } from "../ui";
import { groupNote, printedPage, OTHER_GENERAL_GOVERNMENT, otherGeneralGovernmentNote } from "../labels";
import { usd, signedUsd, pct, change } from "../format";
import { GENERAL_FUND } from "./GeneralFund";
import UnitHistory from "./UnitHistory";

// Fund groups in book order, general fund first; within a group, largest budget first.
function groupUnits(units) {
  const order = [...new Set(units.map((u) => u.fund_group))]
    .sort((a, c) => (a === GENERAL_FUND ? -1 : c === GENERAL_FUND ? 1 : 0));
  return order.map((g) => ({
    name: g,
    units: units.filter((u) => u.fund_group === g)
      .sort((a, c) => c.total_expenses.proposed - a.total_expenses.proposed),
  }));
}

// "Changed from request", never "cut": some budgets came in above the request.
function requestLine(t) {
  const d = t.proposed - t.requested;
  if (t.requested === 0 && t.proposed > 0) return `Nothing was requested. The proposed budget includes ${usd(t.proposed)}.`;
  if (d === 0) return "The proposed budget matches the request.";
  const dir = d < 0 ? "below" : "above";
  return `Changed from request: ${signedUsd(d)} (${pct(Math.abs(change(t.proposed, t.requested)))} ${dir} the request).`;
}

// On phones the rows are restyled as grids (styles.css), which can strip table
// semantics, so the roles are explicit.
function CategoryTable({ title, rows, total, years }) {
  // Rows with no money in any column shown are left out.
  const shown = rows.filter((r) => r.current_adopted || r.requested || r.proposed);
  return (
    <TableScroll label={title}>
      <table className="tbl tbl-detail" role="table">
        <caption>{title}</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Category</th>
            <th scope="col" role="columnheader" className="num">{years.current} adopted</th>
            <th scope="col" role="columnheader" className="num">{years.budget} requested</th>
            <th scope="col" role="columnheader" className="num">{years.budget} proposed</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {shown.map((r) => (
            <tr key={r.category} role="row">
              <th scope="row" role="rowheader">{r.category}</th>
              <td role="cell" className="num">{usd(r.current_adopted)}</td>
              <td role="cell" className="num">{usd(r.requested)}</td>
              <td role="cell" className="num">{usd(r.proposed)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot role="rowgroup">
          <tr role="row">
            <th scope="row" role="rowheader">Total</th>
            <td role="cell" className="num">{usd(total.current_adopted)}</td>
            <td role="cell" className="num">{usd(total.requested)}</td>
            <td role="cell" className="num">{usd(total.proposed)}</td>
          </tr>
        </tfoot>
      </table>
    </TableScroll>
  );
}

function UnitDetail({ u, meta, history }) {
  const t = u.total_expenses;
  const { years } = meta;
  return (
    <div className="unit-detail">
      <dl className="unit-figs">
        <div><dt>{years.current} adopted</dt><dd>{usd(t.current_adopted)}</dd></div>
        <div><dt>{years.budget} requested</dt><dd>{usd(t.requested)}</dd></div>
        <div><dt>{years.budget} proposed</dt><dd>{usd(t.proposed)}</dd></div>
      </dl>
      <p className="unit-request">{requestLine(t)}</p>
      {u.name === OTHER_GENERAL_GOVERNMENT && <p className="unit-flag">{otherGeneralGovernmentNote(u, usd)}</p>}
      <UnitHistory u={u} h={history.byUnit.get(u.name)} meta={meta} offset={history.source.printed_page_offset} />
      <CategoryTable title="Spending" rows={u.expenses} total={t} years={years} />
      {u.total_revenue
        ? <CategoryTable title="Revenue" rows={u.revenues} total={u.total_revenue} years={years} />
        : <p className="note">This budget has no revenue table.</p>}
      <p className="unit-page">
        See the city&rsquo;s page: page {printedPage(u.page, meta)} of the budget book (page {u.page} of the PDF).
      </p>
    </div>
  );
}

function UnitRow({ u, meta, history, max }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const t = u.total_expenses;
  return (
    <li className={"unit" + (open ? " open" : "")}>
      <button type="button" className="unit-row" aria-expanded={open} aria-controls={panel}
        onClick={() => setOpen(!open)}>
        <span className="unit-name">
          {u.name}
          {/* Length = this budget against the largest of all 41, so sizes compare across groups. */}
          <span className="unit-scale" aria-hidden="true"><i style={{ width: `${(t.proposed / max) * 100}%` }} /></span>
        </span>
        <span className="unit-amt">{usd(t.proposed)}</span>
        <span className="unit-chg"><Change value={change(t.proposed, t.current_adopted)} /></span>
        <ChevronDown className="unit-chev" size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && <div id={panel}><UnitDetail u={u} meta={meta} history={history} /></div>}
    </li>
  );
}

export default function Departments({ b, history, status }) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const { years } = b.meta;
  const groups = useMemo(() => groupUnits(b.units), [b.units]);
  const max = Math.max(...b.units.map((u) => u.total_expenses.proposed));
  const q = query.trim().toLowerCase();
  const shown = groups
    .map((g) => ({ ...g, units: q ? g.units.filter((u) => u.name.toLowerCase().includes(q)) : g.units }))
    .filter((g) => g.units.length);

  return (
    <section id="departments" className="block">
      <SectionHead title="What each department asked for, and got" status={status}>
        All {b.units.length} department and fund budgets in the book. Open one to see its{" "}
        {years.current} budget, its {years.budget} request, the proposed amount, where the money goes, and
        about 10 years of budgeted and actual spending.
      </SectionHead>

      <div className="search">
        <label htmlFor={searchId}>Find a department or fund</label>
        <input id={searchId} type="search" value={query} placeholder="Police, water, parks…"
          onChange={(e) => setQuery(e.target.value)} />
      </div>

      {shown.length === 0 && <p className="note">No department or fund matches &ldquo;{query}&rdquo;.</p>}

      {shown.map((g) => {
        const full = groups.find((x) => x.name === g.name);
        const sum = full.units.reduce((s, u) => s + u.total_expenses.proposed, 0);
        return (
          <div className="group" key={g.name}>
            <div className="group-head">
              <h3>{g.name}</h3>
              <span className="group-sum">{usd(sum)}</span>
            </div>
            <p className="group-note">{groupNote(g.name)}</p>
            <div className="unit-cols" aria-hidden="true">
              <span>Budget</span><span>{years.budget} proposed</span><span>vs. {years.current}</span>
            </div>
            <ul className="units">
              {g.units.map((u) => <UnitRow key={u.name} u={u} meta={b.meta} history={history} max={max} />)}
            </ul>
          </div>
        );
      })}

      <p className="note">
        Together the {b.units.length} budgets propose {usd(b.units.reduce((s, u) => s + u.total_expenses.proposed, 0))} in
        spending. That total counts some dollars twice: money moved from one city fund to another, and
        internal service funds that bill other departments, are counted in both places.
      </p>
    </section>
  );
}
