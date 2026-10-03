import React from "react";
import { CITY_BUDGET_PAGE, CORRECTIONS_EMAIL, WPR_URL, WPR_PHONE, SUPPORT_URL, MEETING_TRACKER_URL } from "../labels";
import { usd, pct, change } from "../format";
import { useStrings } from "../i18n.jsx";

const BADGE = `${import.meta.env.BASE_URL}wpr-typewriter-badge.png`;

// Source, method and caveats in plain language (rules 2, 3 and 5).
export function About({ b, status }) {
  const t = useStrings();
  const { years } = b.meta;
  const tr = b.tax_rate;
  const allFunds = b.all_funds.expenditures_by_category.total.budget;
  const avGrowth = change(tr.assessed_valuation.budget_year, tr.assessed_valuation.current_year);
  return (
    <section id="about" className="block block-about">
      <header className="sec-head">
        <h2>{t("about.title")}</h2>
        <p className="status-line">{status}</p>
      </header>
      <dl className="about">
        <dt>{t("about.sourceT")}</dt>
        <dd>{t("about.sourceD", { year: years.budget, pages: b.meta.pages, url: CITY_BUDGET_PAGE })}</dd>
        <dt>{t("about.methodT")}</dt>
        <dd>{t("about.methodD", b.units.length)}</dd>
        <dt>{t("about.historyT")}</dt>
        <dd>{t("about.historyD")}</dd>
        <dt>{t("about.rateT")}</dt>
        <dd>{t("about.rateD", { year: years.budget, rate: `$${tr.rate_per_1000.budget_year.toFixed(4)}`, growth: pct(avGrowth, 2) })}</dd>
        <dt>{t("about.cityT")}</dt>
        <dd>{t("about.cityD")}</dd>
        <dt>{t("about.allFundsT", usd(allFunds))}</dt>
        <dd>{t("about.allFundsD")}</dd>
        <dt>{t("about.finalT")}</dt>
        <dd>{t("about.finalD")}</dd>
        <dt>{t("about.correctionsT")}</dt>
        <dd>{t("about.correctionsD", CORRECTIONS_EMAIL)}</dd>
        <dt>{t("about.dataT")}</dt>
        <dd>{t("about.dataD", import.meta.env.BASE_URL)}</dd>
      </dl>
    </section>
  );
}

// The close: who built this, how, and how to keep it going. A bookend to the
// banner, for readers and for anyone weighing whether to fund the work.
export function Support({ b }) {
  const t = useStrings();
  return (
    <aside className="support" aria-labelledby="support-title">
      <div className="support-inner">
        <h2 id="support-title">{t("support.title")}</h2>
        <p>{t("support.body", { pages: b.meta.pages, units: b.units.length })}</p>
        <div className="support-actions">
          <a className="support-btn" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">{t("support.button")}</a>
          <a className="support-link" href={MEETING_TRACKER_URL} target="_blank" rel="noopener noreferrer">{t("support.meetings")}</a>
        </div>
      </div>
    </aside>
  );
}

// WPR footer invariants: seal, provenance, non-affiliation, name and phone.
export function Footer({ b }) {
  const t = useStrings();
  return (
    <footer className="foot">
      <img className="foot-badge" src={BADGE} alt="" width="44" height="44" decoding="async" />
      <div>
        <p>{t(`foot.data.${b.meta.stage}`, b.meta.years.budget)}</p>
        <p>{t("foot.notAffiliated")}</p>
        <p><a href={WPR_URL} target="_blank" rel="noopener noreferrer">Wausau Pilot &amp; Review</a> &middot; {WPR_PHONE}</p>
      </div>
    </footer>
  );
}
