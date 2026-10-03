import React from "react";
import { signedPct, signedUsd } from "./format";

// Section header: title, standfirst, and the budget's status line, which every
// section carries so a screenshot of any one of them is labeled.
export function SectionHead({ title, status, children }) {
  return (
    <header className="sec-head">
      <h2>{title}</h2>
      <p className="status-line">{status}</p>
      {children && <p className="standfirst">{children}</p>}
    </header>
  );
}

// A change, shown neutrally: direction by glyph and sign, never by red/green.
// A bigger or smaller budget is not good or bad by itself.
export function Change({ value, kind = "pct", digits = 1 }) {
  if (value === null) return <span className="chg muted">new</span>;
  if (value === 0) return <span className="chg muted">no change</span>;
  const glyph = value > 0 ? "▲" : "▼";
  return (
    <span className="chg">
      <span className="chg-glyph" aria-hidden="true">{glyph}</span>
      {kind === "pct" ? signedPct(value, digits) : kind === "fte" ? (value > 0 ? "+" : "−") + Math.abs(value).toFixed(2) : signedUsd(value)}
    </span>
  );
}

// Mini column sparkline (pure SVG). `values` oldest first; null is a gap.
// The last column is the budget year and carries the accent.
export function Spark({ values, label, max }) {
  const w = 96, h = 26, gap = 2;
  const top = max ?? Math.max(...values.filter((v) => v !== null), 0);
  const bw = (w - gap * (values.length - 1)) / values.length;
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      {values.map((v, i) => {
        if (v === null || top === 0) return null;
        const bh = Math.max((v / top) * h, v > 0 ? 1.5 : 0);
        return (
          <rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={1}
            className={i === values.length - 1 ? "spark-now" : "spark-past"} />
        );
      })}
    </svg>
  );
}

// Horizontal bar used by the ranked lists (single hue: length is the only encoding).
export function Bar({ value, max }) {
  return (
    <span className="hbar" aria-hidden="true">
      <span className="hbar-fill" style={{ width: max ? `${(value / max) * 100}%` : 0 }} />
    </span>
  );
}

// Wide tables scroll inside their own container, never the page.
export function TableScroll({ label, children }) {
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
