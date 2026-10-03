import React from "react";
import { WPR_URL } from "../labels";
import { compact, pct, change } from "../format";

const BADGE = `${import.meta.env.BASE_URL}wpr-typewriter-badge.png`;
const WORDMARK = `${import.meta.env.BASE_URL}wpr-wordmark.png`;

const SECTIONS = [
  ["bill", "Your bill"],
  ["levy", "The levy"],
  ["general-fund", "General fund"],
  ["departments", "Departments"],
  ["fees", "Fees"],
  ["capital", "Projects"],
  ["debt", "Debt"],
  ["staffing", "Staffing"],
  ["about", "About"],
];

// WPR's flag (seal + wordmark, tagline, dateline) above the tool's own banner.
// The flag is WPR's; the tool's title sits below it, never above.
export function Flag() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  return (
    <div className="flag">
      <a className="flag-lockup" href={WPR_URL} target="_blank" rel="noopener noreferrer"
        aria-label="Wausau Pilot & Review home">
        <img className="flag-badge" src={BADGE} alt="" width="62" height="62" decoding="async" />
        <img className="flag-wordmark" src={WORDMARK} alt="Wausau Pilot & Review" width="640" height="82" />
      </a>
      <div className="flag-tagline">Where Locals Look First For News</div>
      <div className="flag-dateline">
        <span>{today}</span>
        <span className="flag-place">Wausau, Wisconsin</span>
      </div>
    </div>
  );
}

// The subject banner: tool title, dek, status, and the three numbers the story
// leads with (rule 5: the levy and the general fund, not the all-funds total).
export function Banner({ b, status }) {
  const { years } = b.meta;
  const tr = b.tax_rate;
  const levyChange = change(tr.levy.budget_year, tr.levy.current_year);
  return (
    <header className="banner">
      <div className="banner-inner">
        <div className="banner-kicker">Follow the Money &middot; {b.meta.entity}</div>
        <h1>Follow the Money: Wausau&rsquo;s {years.budget} budget</h1>
        <p className="banner-dek">
          What the city&rsquo;s share of your property tax bill pays for, where the levy goes,
          and what each department asked for and got.
        </p>
        <p className="banner-status"><span className="banner-dot" aria-hidden="true" />{status}</p>
        <dl className="banner-stats">
          <div>
            <dt>City tax levy</dt>
            <dd>{compact(tr.levy.budget_year)}</dd>
            <dd className="banner-sub">up {pct(levyChange, 2)} from {years.current}</dd>
          </div>
          <div>
            <dt>Rate per $1,000</dt>
            <dd>${tr.rate_per_1000.budget_year.toFixed(4)}</dd>
            <dd className="banner-sub">{tr.assessed_valuation_is_estimate ? "preliminary; " : ""}${tr.rate_per_1000.current_year.toFixed(4)} in {years.current}</dd>
          </div>
          <div>
            <dt>General fund spending</dt>
            <dd>{compact(b.general_fund.total_expenditures.budget)}</dd>
            <dd className="banner-sub">police, fire, streets, parks, city hall</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}

export function SectionNav() {
  return (
    <nav className="secnav" aria-label="Sections">
      {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
    </nav>
  );
}
