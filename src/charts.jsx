import React, { lazy, Suspense } from "react";

// Chart colors. Validated with the dataviz palette checker against the cream
// surface: teal (brand) / blue / ochre pass CVD and normal-vision separation in
// this order; the warm gray is the deliberate neutral for "all other funds".
// Ochre and gray sit under 3:1 against the surface, so every chart here ships
// with a legend and a table of the same numbers.
export const SERIES = { teal: "#3A867C", blue: "#2E5C9A", ochre: "#C9922E", gray: "#77706A" };

// Ten-year history colors: a light tint of the brand teal for the budget bars
// (it recedes, so the actual line reads in front) and blue for actual spending.
// Checked with the dataviz validator: ΔE 31 apart; the tint is under 3:1 on the
// surface, so every history chart ships with a table.
export const HISTORY = { budget: "#8DBFB7", actual: "#2E5C9A", proposed: "#7A4F0E" };
const HISTORY_HEIGHT = 220;

export function Legend({ series }) {
  return (
    <ul className="legend">
      {series.map((s) => (
        <li key={s.key}><i className="legend-sw" style={{ background: s.color }} aria-hidden="true" />{s.label}</li>
      ))}
    </ul>
  );
}

// The charts themselves (plots.jsx, with recharts) load after the first render,
// so the banner and calculator do not wait for the page's largest library. The
// chart's own height is held meanwhile, so nothing below it moves.
const plots = () => import("./plots");
const LazyStacked = lazy(() => plots().then((m) => ({ default: m.StackedColumns })));
const LazyHistory = lazy(() => plots().then((m) => ({ default: m.HistoryChart })));
const hold = (height) => <div className="chart" style={{ height }} aria-hidden="true" />;

export function StackedColumns(props) {
  return <Suspense fallback={hold(props.height)}><LazyStacked {...props} /></Suspense>;
}

export function HistoryChart(props) {
  return <Suspense fallback={hold(HISTORY_HEIGHT)}><LazyHistory {...props} height={HISTORY_HEIGHT} /></Suspense>;
}
