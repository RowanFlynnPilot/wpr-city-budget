import React, { useEffect, useState } from "react";
import { loadBudget, loadUpdates } from "./data";
import { statusLine } from "./labels";
import { Flag, Banner, SectionNav } from "./sections/Masthead";
import Updates from "./sections/Updates";
import TaxBill from "./sections/TaxBill";
import Levy from "./sections/Levy";
import GeneralFund from "./sections/GeneralFund";
import Departments from "./sections/Departments";
import Capital from "./sections/Capital";
import Debt from "./sections/Debt";
import Staffing from "./sections/Staffing";
import { About, Footer } from "./sections/About";

/*
 * Follow the Money: Wausau's city budget (Wausau Pilot & Review).
 *
 * One page, one data file. budget.json (from extract_budget.py) and
 * updates.json load at runtime; every figure on screen comes from them. If
 * either fails to load or is missing a key, the page shows an error and throws.
 */
export default function App() {
  const [state, setState] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([loadBudget(), loadUpdates()])
      .then(([b, updates]) => setState({ b, updates }))
      .catch((e) => { setErr(String(e.message || e)); throw e; });
  }, []);

  // The sections exist only after the data loads, so a deep link (#debt)
  // scrolls once they do.
  useEffect(() => {
    if (state && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [state]);

  if (err) {
    return (
      <div className="ftm">
        <Flag />
        <div className="load load-error" role="alert">
          <b>The budget data could not be loaded.</b> {err}
        </div>
      </div>
    );
  }
  if (!state) return <div className="ftm"><Flag /><p className="load">Loading the budget&hellip;</p></div>;

  const { b, updates } = state;
  const status = statusLine(b.meta);
  return (
    <div className="ftm">
      <Flag />
      <Banner b={b} status={status} />
      <SectionNav />
      <main className="page">
        <Updates updates={updates} />
        <TaxBill b={b} status={status} />
        <Levy b={b} status={status} />
        <GeneralFund b={b} status={status} />
        <Departments b={b} status={status} />
        <Capital b={b} status={status} />
        <Debt b={b} status={status} />
        <Staffing b={b} status={status} />
        <About b={b} status={status} />
      </main>
      <Footer b={b} />
    </div>
  );
}
