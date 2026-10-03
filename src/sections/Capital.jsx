import React from "react";
import { SectionHead, Bar } from "../ui";
import { DISCREPANCY_CONTEXT, printedPage } from "../labels";
import { usd, pct } from "../format";

function ProjectList({ projects, showDept }) {
  return (
    <ul className="projects">
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

// A known mismatch in the city's own document, from source_discrepancies.
function DiscrepancyNote({ d, meta }) {
  return (
    <p className="flagnote">
      <b>A gap in the city&rsquo;s list.</b> The printed total, {usd(d.printed_total)}, is{" "}
      {usd(d.printed_total - d.sum_of_rows)} more than the projects listed, which add up to{" "}
      {usd(d.sum_of_rows)} (page {printedPage(d.page, meta)} of the budget book).{" "}
      {DISCREPANCY_CONTEXT[d.check]}
    </p>
  );
}

export default function Capital({ b, status }) {
  const { years } = b.meta;
  const cp = b.capital_projects;
  const dp = b.deferred_projects;
  const count = cp.categories.reduce((s, c) => s + c.projects.length, 0);
  const fundingMax = Math.max(...cp.funding.map((f) => f.amount));
  const deferredCount = dp.departments.reduce((s, d) => s + d.projects.length, 0);

  return (
    <section id="capital" className="block">
      <SectionHead title="What the city plans to build and buy" status={status}>
        The proposed budget funds {count} listed projects totaling {usd(cp.total)} in {years.budget}.
        Another {deferredCount} requests, worth {usd(dp.total)}, were left out.
      </SectionHead>

      {cp.categories.map((c) => {
        const d = b.source_discrepancies.find((x) => x.check === `capital projects: ${c.name}`);
        return (
          <div className="cat" key={c.name}>
            <div className="cat-head">
              <h3>{c.name}</h3>
              <span className="cat-sum">{usd(c.total)}</span>
            </div>
            <ProjectList projects={c.projects} showDept />
            {d && <DiscrepancyNote d={d} meta={b.meta} />}
          </div>
        );
      })}

      <h3 className="subhead">How the projects are paid for</h3>
      <ol className="ranked ranked-simple">
        {[...cp.funding].sort((a, c) => c.amount - a.amount).map((f) => (
          <li key={f.source} className="rank">
            <span className="rank-name">{f.source}</span>
            <Bar value={f.amount} max={fundingMax} />
            <span className="rank-amt">{usd(f.amount)}</span>
            <span className="rank-share">{pct((f.amount / cp.total_funding) * 100)}</span>
          </li>
        ))}
      </ol>
      <p className="note">
        Funding sources as the city lists them, totaling {usd(cp.total_funding)} (page{" "}
        {printedPage(cp.page, b.meta)} of the budget book).
      </p>

      <h3 className="subhead">Requested but left out</h3>
      <p className="subnote">
        Projects departments asked for that are not in the proposed budget: {usd(dp.total)} in all
        (page {printedPage(dp.page, b.meta)} of the budget book).
      </p>
      <div className="deferred">
        {[...dp.departments]
          .map((d) => ({ ...d, sum: d.projects.reduce((s, p) => s + p.amount, 0) }))
          .sort((a, c) => c.sum - a.sum)
          .map((d) => (
            <div className="cat cat-deferred" key={d.name}>
              <div className="cat-head">
                <h4>{d.name}</h4>
                <span className="cat-sum">{usd(d.sum)}</span>
              </div>
              <ProjectList projects={d.projects} />
            </div>
          ))}
      </div>
    </section>
  );
}
