import React, { useEffect, useRef, useState } from "react";
import { WPR_URL } from "../labels";
import { pct, change } from "../format";
import { BillCalculator } from "./TaxBill";
import { jumpTo } from "../ui";
import { useStrings } from "../i18n.jsx";
import sponsor from "../sponsors.json";

const BADGE = `${import.meta.env.BASE_URL}wpr-typewriter-badge.png`;
const WORDMARK = `${import.meta.env.BASE_URL}wpr-wordmark.png`;

const SECTIONS = ["bill", "levy", "general-fund", "departments", "fees", "capital", "debt", "staffing", "about"];

// WPR's flag (seal + wordmark, tagline, dateline) above the tool's own banner.
// The flag is WPR's; the tool's title sits below it, never above. The tagline
// is WPR's and stays in English.
export function Flag() {
  const t = useStrings();
  return (
    <header className="flag">
      <a className="flag-lockup" href={WPR_URL} target="_blank" rel="noopener noreferrer"
        aria-label={t("flag.homeAria")}>
        <img className="flag-badge" src={BADGE} alt="" width="62" height="62" decoding="async" />
        <img className="flag-wordmark" src={WORDMARK} alt="Wausau Pilot & Review" width="640" height="82" />
      </a>
      <div className="flag-tagline" lang="en">Where Locals Look First For News</div>
      <div className="flag-dateline">
        <span>{t("fmt.today", new Date())}</span>
        <span className="flag-place" lang="en">Wausau, Wisconsin</span>
      </div>
    </header>
  );
}

// The sponsor credit (src/sponsors.json). Nothing renders until it is enabled;
// an enabled credit with no name stops the page rather than show an empty one.
function SponsorSlot() {
  const t = useStrings();
  if (!sponsor.enabled) return null;
  if (!sponsor.name) throw new Error("src/sponsors.json is enabled but has no name");
  const logo = sponsor.logo && (sponsor.logo.startsWith("https://") ? sponsor.logo : import.meta.env.BASE_URL + sponsor.logo);
  const inner = (
    <>
      <span className="sponsor-label">{t("sponsor.presentedBy")}</span>
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
// calculator, so the first thing on screen is the reader's own bill. `card`:
// the banner alone, for a story's fixed-height embed (?view=card).
export function Banner({ b, status, assessed, onAssessed, card }) {
  const t = useStrings();
  const { years } = b.meta;
  const tr = b.tax_rate;
  const levyChange = change(tr.levy.budget_year, tr.levy.current_year);
  return (
    <header className="banner">
      <div className="banner-inner">
        {!card && <div className="banner-kicker">{t("banner.kicker")}</div>}
        <SponsorSlot />
        <h1>{t("banner.title", years.budget)}</h1>
        {/* In a story the article around the card already says this. */}
        {!card && (
          <p className="banner-dek">
            {t("banner.dek", {
              levy: t("fmt.millions", tr.levy.budget_year), pct: pct(levyChange, 2),
              spend: t("fmt.millions", b.general_fund.total_expenditures.budget),
            })}
          </p>
        )}
        <p className="banner-status"><span className="banner-dot" aria-hidden="true" />{status}</p>
        <BillCalculator b={b} assessed={assessed} onChange={onAssessed} card={card} />
      </div>
    </header>
  );
}

// Section links; the one for the section in view is marked as you scroll, and
// on phones, where the links scroll sideways, it is brought into view.
export function SectionNav() {
  const t = useStrings();
  const [active, setActive] = useState(null);
  const nav = useRef(null);
  useEffect(() => {
    // Back above the first section (it has left the band downward), no link is marked.
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) setActive(e.target.id);
        else if (e.target.id === SECTIONS[0] && e.boundingClientRect.top > 0) setActive(null);
      }),
      { rootMargin: "-40% 0px -55% 0px" });
    SECTIONS.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const a = active && nav.current.querySelector(`a[href="#${active}"]`);
    const left = a ? a.offsetLeft + a.offsetWidth / 2 - nav.current.clientWidth / 2 : 0;
    nav.current.scrollTo({ left, behavior: "smooth" });
  }, [active]);
  return (
    <nav className="secnav" aria-label={t("nav.aria")} ref={nav}>
      {SECTIONS.map((id) => (
        <a key={id} href={`#${id}`} onClick={jumpTo(id)} className={active === id ? "on" : ""} aria-current={active === id ? "true" : undefined}>{t(`nav.${id}`)}</a>
      ))}
    </nav>
  );
}
