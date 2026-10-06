import React from "react";
import { SectionHead, Bar } from "../ui";
import { printedPage } from "../labels";
import { usd, pct } from "../format";
import { useStrings } from "../i18n.jsx";

// Project, category, department and funding names are the city's and stay in
// English in every language.
function ProjectList({ projects, showDept }) {
  return (
    <ul className="projects" lang="en">
      {projects.map((p, i) => (
        <li key={i} className="proj">
          <span className="proj-desc">
            {p.description}
            {showDept && p.department && <span className="proj-dept">{p.department}</span>}
          </span>
          <span className="proj-amt">{usd(p.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

// A known mismatch in the city's own document, from source_discrepancies; its
// editorial context is a string keyed by the check.
function DiscrepancyNote({ d, meta }) {
  const t = useStrings();
  return (
    <p className="flagnote">
      {t("cap.gap", {
        printed: usd(d.printed_total), diff: usd(d.printed_total - d.sum_of_rows), sum: usd(d.sum_of_rows),
        page: printedPage(d.page, meta), context: t(`discrepancy.${d.check}`),
      })}
    </p>
  );
}

export default function Capital({ b, status }) {
  const t = useStrings();
  const { years } = b.meta;
  const cp = b.capital_projects;
  const dp = b.deferred_projects;
  const count = cp.categories.reduce((s, c) => s + c.projects.length, 0);
  const fundingMax = Math.max(...cp.funding.map((f) => f.amount));
  const deferredCount = dp.departments.reduce((s, d) => s + d.projects.length, 0);
  const top = cp.categories.flatMap((c) => c.projects).reduce((a, p) => (p.amount > a.amount ? p : a));

  return (
    <section id="capital" className="block">
      <SectionHead title={t("cap.title")} status={status}>
        {t("cap.standfirst", {
          count, total: usd(cp.total), year: years.budget, deferred: deferredCount, deferredTotal: usd(dp.total),
          top: top.description, topAmount: usd(top.amount), topShare: pct((top.amount / cp.total) * 100, 0),
        })}
      </SectionHead>

      {cp.categories.map((c) => {
        const d = b.source_discrepancies.find((x) => x.check === `capital projects: ${c.name}`);
        return (
          <div className="cat" key={c.name}>
            <div className="cat-head">
              <h3 lang="en">{c.name}</h3>
              <span className="cat-sum">{usd(c.total)}</span>
            </div>
            <ProjectList projects={c.projects} showDept />
            {d && <DiscrepancyNote d={d} meta={b.meta} />}
          </div>
        );
      })}

      <h3 className="subhead">{t("cap.fundingTitle")}</h3>
      <ol className="ranked ranked-simple">
        {[...cp.funding].sort((a, c) => c.amount - a.amount).map((f) => (
          <li key={f.source} className="rank">
            <span className="rank-name" lang="en">{f.source}</span>
            <Bar value={f.amount} max={fundingMax} />
            <span className="rank-amt">{usd(f.amount)}</span>
            <span className="rank-share">{pct((f.amount / cp.total_funding) * 100)}</span>
          </li>
        ))}
      </ol>
      <p className="note">{t("cap.fundingNote", { total: usd(cp.total_funding), page: printedPage(cp.page, b.meta) })}</p>

      <h3 className="subhead">{t("cap.deferredTitle")}</h3>
      <p className="subnote">{t("cap.deferredNote", { total: usd(dp.total), page: printedPage(dp.page, b.meta) })}</p>
      <div className="deferred">
        {[...dp.departments]
          .map((d) => ({ ...d, sum: d.projects.reduce((s, p) => s + p.amount, 0) }))
          .sort((a, c) => c.sum - a.sum)
          .map((d) => (
            <div className="cat cat-deferred" key={d.name}>
              <div className="cat-head">
                <h4 lang="en">{d.name}</h4>
                <span className="cat-sum">{usd(d.sum)}</span>
              </div>
              <ProjectList projects={d.projects} />
            </div>
          ))}
      </div>
    </section>
  );
}
