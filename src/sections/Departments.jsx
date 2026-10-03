import React, { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHead, Change, TableScroll } from "../ui";
import { printedPage, OTHER_GENERAL_GOVERNMENT, administratorCost } from "../labels";
import { usd, signedUsd, pct, change } from "../format";
import { useStrings } from "../i18n.jsx";
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
function requestLine(x, t) {
  const d = x.proposed - x.requested;
  if (x.requested === 0 && x.proposed > 0) return t("dept.reqNothing", usd(x.proposed));
  if (d === 0) return t("dept.reqSame");
  return t("dept.reqChanged", {
    diff: signedUsd(d), pct: pct(Math.abs(change(x.proposed, x.requested))), dir: d < 0 ? "below" : "above",
  });
}

// On phones the rows are restyled as grids (styles.css), which can strip table
// semantics, so the roles are explicit.
function CategoryTable({ title, rows, total, years }) {
  const t = useStrings();
  // Rows with no money in any column shown are left out.
  const shown = rows.filter((r) => r.current_adopted || r.requested || r.proposed);
  return (
    <TableScroll label={title}>
      <table className="tbl tbl-detail" role="table">
        <caption>{title}</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">{t("dept.colCategory")}</th>
            <th scope="col" role="columnheader" className="num">{t("dept.adopted", years.current)}</th>
            <th scope="col" role="columnheader" className="num">{t("dept.requested", years.budget)}</th>
            <th scope="col" role="columnheader" className="num">{t("dept.proposed", years.budget)}</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {shown.map((r) => (
            <tr key={r.category} role="row">
              <th scope="row" role="rowheader" lang="en">{r.category}</th>
              <td role="cell" className="num">{usd(r.current_adopted)}</td>
              <td role="cell" className="num">{usd(r.requested)}</td>
              <td role="cell" className="num">{usd(r.proposed)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot role="rowgroup">
          <tr role="row">
            <th scope="row" role="rowheader">{t("table.total")}</th>
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
  const t = useStrings();
  const x = u.total_expenses;
  const { years } = meta;
  return (
    <div className="unit-detail">
      <dl className="unit-figs">
        <div><dt>{t("dept.adopted", years.current)}</dt><dd>{usd(x.current_adopted)}</dd></div>
        <div><dt>{t("dept.requested", years.budget)}</dt><dd>{usd(x.requested)}</dd></div>
        <div><dt>{t("dept.proposed", years.budget)}</dt><dd>{usd(x.proposed)}</dd></div>
      </dl>
      <p className="unit-request">{requestLine(x, t)}</p>
      {u.name === OTHER_GENERAL_GOVERNMENT && <p className="unit-flag">{t("ogg.note", usd(administratorCost(u)))}</p>}
      <UnitHistory u={u} h={history.byUnit.get(u.name)} meta={meta} offset={history.source.printed_page_offset} />
      <CategoryTable title={t("dept.spending")} rows={u.expenses} total={x} years={years} />
      {u.total_revenue
        ? <CategoryTable title={t("dept.revenue")} rows={u.revenues} total={u.total_revenue} years={years} />
        : <p className="note">{t("dept.noRevenue")}</p>}
      <p className="unit-page">{t("dept.page", { printed: printedPage(u.page, meta), pdf: u.page })}</p>
    </div>
  );
}

function UnitRow({ u, meta, history, max }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const x = u.total_expenses;
  return (
    <li className={"unit" + (open ? " open" : "")}>
      <button type="button" className="unit-row" aria-expanded={open} aria-controls={panel}
        onClick={() => setOpen(!open)}>
        <span className="unit-name" lang="en">
          {u.name}
          {/* Length = this budget against the largest of all 41, so sizes compare across groups. */}
          <span className="unit-scale" aria-hidden="true"><i style={{ width: `${(x.proposed / max) * 100}%` }} /></span>
        </span>
        <span className="unit-amt">{usd(x.proposed)}</span>
        <span className="unit-chg"><Change value={change(x.proposed, x.current_adopted)} /></span>
        <ChevronDown className="unit-chev" size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && <div id={panel}><UnitDetail u={u} meta={meta} history={history} /></div>}
    </li>
  );
}

export default function Departments({ b, history, status }) {
  const t = useStrings();
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
      <SectionHead title={t("dept.title")} status={status}>
        {t("dept.standfirst", { n: b.units.length, current: years.current, budget: years.budget })}
      </SectionHead>

      <div className="search">
        <label htmlFor={searchId}>{t("dept.searchLabel")}</label>
        <input id={searchId} type="search" value={query} placeholder={t("dept.searchPlaceholder")}
          onChange={(e) => setQuery(e.target.value)} />
      </div>

      {shown.length === 0 && <p className="note">{t("dept.noMatch", query)}</p>}

      {shown.map((g) => {
        const full = groups.find((x) => x.name === g.name);
        const sum = full.units.reduce((s, u) => s + u.total_expenses.proposed, 0);
        return (
          <div className="group" key={g.name}>
            <div className="group-head">
              <h3 lang="en">{g.name}</h3>
              <span className="group-sum">{usd(sum)}</span>
            </div>
            <p className="group-note">{t(`group.${g.name}`)}</p>
            <div className="unit-cols" aria-hidden="true">
              <span>{t("dept.colBudget")}</span><span>{t("dept.proposed", years.budget)}</span><span>{t("gf.colVs", years.current)}</span>
            </div>
            <ul className="units">
              {g.units.map((u) => <UnitRow key={u.name} u={u} meta={b.meta} history={history} max={max} />)}
            </ul>
          </div>
        );
      })}

      <p className="note">
        {t("dept.totalNote", { n: b.units.length, total: usd(b.units.reduce((s, u) => s + u.total_expenses.proposed, 0)) })}
      </p>
    </section>
  );
}
