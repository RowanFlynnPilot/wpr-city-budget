import React, { useEffect, useRef, useState } from "react";
import { WPR_URL } from "../labels";
import { millions, pct, change } from "../format";
import { BillCalculator } from "./TaxBill";
import { jumpTo } from "../ui";
import sponsor from "../sponsors.json";

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
    <header className="flag">
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
    </header>
  );
}

// The sponsor credit (src/sponsors.json). Nothing renders until it is enabled;
// an enabled credit with no name stops the page rather than show an empty one.
function SponsorSlot() {
  if (!sponsor.enabled) return null;
  if (!sponsor.name) throw new Error("src/sponsors.json is enabled but has no name");
  const logo = sponsor.logo && (sponsor.logo.startsWith("https://") ? sponsor.logo : import.meta.env.BASE_URL + sponsor.logo);
  const inner = (
    <>
      <span className="sponsor-label">{sponsor.label}</span>
      {logo
        ? <span className="sponsor-logo"><img src={logo} alt={sponsor.name} /></span>
        : <span className="sponsor-name">{sponsor.name}</span>}
    </>
  );
  if (!sponsor.url) return <div className="sponsor">{inner}</div>;
  const url = new URL(sponsor.url);
  url.searchParams.set("utm_source", "wausaupilotandreview");
  url.searchParams.set("utm_medium", "widget");
  url.searchParams.set("utm_campaign", "wpr-city-budget");
  return <a className="sponsor" href={url.href} target="_blank" rel="noopener noreferrer sponsored">{inner}</a>;
}

// The subject banner: tool title, the proposal in one sentence (rule 5: the
// levy and the general fund, not the all-funds total), the status, and the
// calculator, so the first thing on screen is the reader's own bill.
export function Banner({ b, status, assessed, onAssessed }) {
  const { years } = b.meta;
  const tr = b.tax_rate;
  const levyChange = change(tr.levy.budget_year, tr.levy.current_year);
  return (
    <header className="banner">
      <div className="banner-inner">
        <div className="banner-top">
          <div className="banner-kicker">{b.meta.entity}</div>
          <SponsorSlot />
        </div>
        <h1>Follow the Money: Wausau&rsquo;s {years.budget} budget</h1>
        <p className="banner-dek">
          The proposal would raise {millions(tr.levy.budget_year)} in property
          taxes, up {pct(levyChange, 2)}, and spend {millions(b.general_fund.total_expenditures.budget)} on
          police, fire, streets, parks and city hall. Here is what it means for your bill.
        </p>
        <p className="banner-status"><span className="banner-dot" aria-hidden="true" />{status}</p>
        <BillCalculator b={b} assessed={assessed} onChange={onAssessed} />
      </div>
    </header>
  );
}

// Section links; the one for the section in view is marked as you scroll, and
// on phones, where the links scroll sideways, it is brought into view.
export function SectionNav() {
  const [active, setActive] = useState(null);
  const nav = useRef(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-40% 0px -55% 0px" });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const a = active && nav.current.querySelector(`a[href="#${active}"]`);
    if (a) nav.current.scrollTo({ left: a.offsetLeft + a.offsetWidth / 2 - nav.current.clientWidth / 2, behavior: "smooth" });
  }, [active]);
  return (
    <nav className="secnav" aria-label="Sections" ref={nav}>
      {SECTIONS.map(([id, label]) => (
        <a key={id} href={`#${id}`} onClick={jumpTo(id)} className={active === id ? "on" : ""} aria-current={active === id ? "true" : undefined}>{label}</a>
      ))}
    </nav>
  );
}
