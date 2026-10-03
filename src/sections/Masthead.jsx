import React, { useEffect, useRef, useState } from "react";
import { WPR_URL, CORRECTIONS_EMAIL } from "../labels";
import { pct, change } from "../format";
import { BillCalculator } from "./TaxBill";
import { jumpTo } from "../ui";
import { LANGS, useLang, useStrings } from "../i18n.jsx";
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

// English / Español / Hmoob, each in its own language.
function LangSwitch() {
  const t = useStrings();
  const { lang, setLang } = useLang();
  return (
    <div className="langs" role="group" aria-label={t("lang.label")}>
      {LANGS.map((l) => (
        <button key={l.code} type="button" lang={l.code} aria-pressed={lang === l.code}
          onClick={() => setLang(l.code)}>{l.label}</button>
      ))}
    </div>
  );
}

// In Spanish and Hmong: the names the city publishes stay in English; Hmong
// also carries the beta note inviting corrections.
function LangNote() {
  const t = useStrings();
  const { lang } = useLang();
  if (lang === "en") return null;
  return (
    <div className="lang-note" role="note">
      {lang === "hmn" && <p><b>{t("lang.betaTitle")}</b> {t("lang.betaBody", CORRECTIONS_EMAIL)}</p>}
      <p>{t("lang.namesNote")}</p>
    </div>
  );
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
        <div className="banner-top">
          {!card && <div className="banner-kicker">{t("banner.kicker")}</div>}
          <LangSwitch />
        </div>
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
        {/* The card shows no city names and links to the full page, which carries the notes. */}
        {!card && <LangNote />}
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
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-40% 0px -55% 0px" });
    SECTIONS.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const a = active && nav.current.querySelector(`a[href="#${active}"]`);
    if (a) nav.current.scrollTo({ left: a.offsetLeft + a.offsetWidth / 2 - nav.current.clientWidth / 2, behavior: "smooth" });
  }, [active]);
  return (
    <nav className="secnav" aria-label={t("nav.aria")} ref={nav}>
      {SECTIONS.map((id) => (
        <a key={id} href={`#${id}`} onClick={jumpTo(id)} className={active === id ? "on" : ""} aria-current={active === id ? "true" : undefined}>{t(`nav.${id}`)}</a>
      ))}
    </nav>
  );
}
