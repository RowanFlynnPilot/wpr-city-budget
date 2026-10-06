import React, { useEffect, useState } from "react";
import { loadAll } from "./data";
import { statusLine, CORRECTIONS_EMAIL } from "./labels";
import { useStrings } from "./i18n.jsx";
import { Flag, Banner, SectionNav } from "./sections/Masthead";
import Updates from "./sections/Updates";
import Highlights from "./sections/Highlights";
import TaxBill, { EXAMPLE_ASSESSED } from "./sections/TaxBill";
import Levy from "./sections/Levy";
import GeneralFund from "./sections/GeneralFund";
import Departments from "./sections/Departments";
import Fees from "./sections/Fees";
import Capital from "./sections/Capital";
import Debt from "./sections/Debt";
import Reserves from "./sections/Reserves";
import Staffing from "./sections/Staffing";
import { About, Support, Footer } from "./sections/About";

// ?view=card is the banner and calculator alone, sized for a fixed-height
// iframe in a story (WordPress refuses posts with a script, so a story's embed
// cannot resize itself; see the README). Anything else stops the page.
const VIEWS = ["full", "card"];
function pageView() {
  const v = new URLSearchParams(location.search).get("view") ?? "full";
  if (!VIEWS.includes(v)) throw new Error(`?view=${v}: no such view (${VIEWS.join(", ")})`);
  return v;
}

/*
 * Follow the Money: Wausau's city budget (Wausau Pilot & Review).
 *
 * budget.json (from extract_budget.py), fees.json (hand-verified, checked by
 * check_fees.py), history.json (measured from the book's charts by
 * extract_history.py) and updates.json load at runtime; every figure on screen
 * comes from them. If any fails to load or is missing a key, the page shows an
 * error and throws.
 */
export default function App() {
  const t = useStrings();
  const [view] = useState(pageView);
  const [state, setState] = useState(null);
  const [err, setErr] = useState(null);
  // The assessed value is typed in the banner and followed through the bill section.
  const [assessed, setAssessed] = useState(EXAMPLE_ASSESSED);

  useEffect(() => {
    loadAll()
      .then(setState)
      .catch((e) => { setErr(String(e.message || e)); throw e; });
  }, []);

  // The sections exist only after the data loads, so a deep link (#debt)
  // scrolls once they do. Layout keeps moving for a moment after that (web
  // fonts swap in, and the flow diagram draws once they have), so the section
  // is held in place whenever the page resizes, until the reader takes over.
  useEffect(() => {
    const target = state && location.hash && document.getElementById(location.hash.slice(1));
    if (!target) return;
    const hold = new ResizeObserver(() => target.scrollIntoView());
    hold.observe(document.getElementById("root"));
    const READER = ["wheel", "touchstart", "keydown", "pointerdown"];
    const release = () => {
      hold.disconnect();
      READER.forEach((e) => removeEventListener(e, release));
    };
    READER.forEach((e) => addEventListener(e, release, { passive: true }));
    return release;
  }, [state]);

  // The card sits inside a WPR story, under WPR's own masthead.
  const flag = view === "full" && <Flag />;
  if (err) {
    return (
      <div className="ftm">
        {flag}
        <div className="load load-error" role="alert">
          <b>{t("load.errorTitle")}</b> {t("load.errorBody", CORRECTIONS_EMAIL)}
          <span className="load-detail">{err}</span>
        </div>
      </div>
    );
  }
  if (!state) return <div className="ftm">{flag}<p className="load">{t("load.loading")}</p></div>;

  const { b, fees, history, updates } = state;
  const status = statusLine(b.meta, t);
  if (view === "card") {
    return (
      <div className="ftm ftm-card">
        <main><Banner b={b} status={status} assessed={assessed} onAssessed={setAssessed} card /></main>
      </div>
    );
  }
  return (
    <div className="ftm">
      <Flag />
      <main>
        <Banner b={b} status={status} assessed={assessed} onAssessed={setAssessed} />
        <SectionNav />
        <div className="page">
          <Updates updates={updates} />
          <Highlights b={b} fees={fees} status={status} />
          <TaxBill b={b} status={status} assessed={assessed} />
          <Levy b={b} status={status} />
          <GeneralFund b={b} status={status} />
          <Departments b={b} history={history} status={status} />
          <Fees fees={fees} b={b} status={status} />
          <Capital b={b} status={status} />
          <Debt b={b} status={status} />
          <Reserves b={b} status={status} />
          <Staffing b={b} status={status} />
          <About b={b} status={status} />
        </div>
      </main>
      <Support b={b} />
      <Footer b={b} />
    </div>
  );
}
