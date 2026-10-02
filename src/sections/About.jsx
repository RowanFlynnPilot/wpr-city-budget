import React from "react";
import { CITY_BUDGET_PAGE, CORRECTIONS_EMAIL, WPR_URL, WPR_PHONE } from "../labels";
import { usd, pct, change } from "../format";

const BADGE = `${import.meta.env.BASE_URL}wpr-typewriter-badge.png`;

// Source, method and caveats in plain language (rules 2, 3 and 5).
export function About({ b, status }) {
  const { years } = b.meta;
  const tr = b.tax_rate;
  const allFunds = b.all_funds.expenditures_by_category.total.budget;
  const avGrowth = change(tr.assessed_valuation.budget_year, tr.assessed_valuation.current_year);
  return (
    <section id="about" className="block block-about">
      <header className="sec-head">
        <div className="sec-kicker">About these numbers</div>
        <h2>Source, method and caveats</h2>
        <p className="status-line">{status}</p>
      </header>
      <dl className="about">
        <dt>Source</dt>
        <dd>
          The City of Wausau&rsquo;s {years.budget} proposed budget, as published in
          the {b.meta.pages}-page packet for the city&rsquo;s Finance Committee. Page references
          on this page use the numbers printed in the budget book. The city posts its budget
          documents on its{" "}
          <a href={CITY_BUDGET_PAGE} target="_blank" rel="noopener noreferrer">budget reports page</a>.
        </dd>
        <dt>Method</dt>
        <dd>
          Wausau Pilot &amp; Review extracted every table from the book and checked each one
          against the totals the city printed and against the book&rsquo;s other tables. The{" "}
          {b.units.length} department and fund budgets add up exactly to the citywide totals.
          Where the book disagrees with itself, this page says so.
        </dd>
        <dt>The rate is preliminary</dt>
        <dd>
          The {years.budget} rate of ${tr.rate_per_1000.budget_year.toFixed(4)} per $1,000 divides
          the levy by the city&rsquo;s placeholder for {years.budget} assessed value, which is last
          year&rsquo;s plus {pct(avGrowth, 2)}. It will change when the state publishes final values.
        </dd>
        <dt>The city&rsquo;s part only</dt>
        <dd>
          Your property tax bill also includes Marathon County, your school district and the
          technical college. Their rates are set in mid-November.
        </dd>
        <dt>Why this page doesn&rsquo;t lead with {usd(allFunds)}</dt>
        <dd>
          That is the city&rsquo;s spending across all funds, but it counts some dollars twice:
          money moved between city funds, and internal service funds that bill other departments
          for vehicles, insurance and benefits. The levy and the general fund are the clearer measures.
        </dd>
        <dt>Not yet final</dt>
        <dd>
          These are the mayor&rsquo;s proposals. The Finance Committee and the Common Council can
          change them before the council adopts the budget. Changes will be logged at the top of this page.
        </dd>
        <dt>Corrections</dt>
        <dd>
          See something wrong? Email <a href={`mailto:${CORRECTIONS_EMAIL}`}>{CORRECTIONS_EMAIL}</a>.
        </dd>
        <dt>The data</dt>
        <dd>
          <a href={`${import.meta.env.BASE_URL}budget.json`} download>Download every figure on this page (JSON)</a>.
        </dd>
      </dl>
    </section>
  );
}

// WPR footer invariants: seal, provenance, non-affiliation, name and phone.
export function Footer({ b }) {
  return (
    <footer className="foot">
      <img className="foot-badge" src={BADGE} alt="" width="44" height="44" decoding="async" />
      <div>
        <p>Data: City of Wausau {b.meta.years.budget} {b.meta.stage} budget. Updated by hand as the budget is amended.</p>
        <p>Not affiliated with or endorsed by the City of Wausau.</p>
        <p><a href={WPR_URL} target="_blank" rel="noopener noreferrer">Wausau Pilot &amp; Review</a> &middot; {WPR_PHONE}</p>
      </div>
    </footer>
  );
}
