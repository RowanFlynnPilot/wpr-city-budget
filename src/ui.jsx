import React, { useState } from "react";
import { Share2 } from "lucide-react";
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

// In-page links scroll the section into view rather than follow the hash:
// inside the WordPress iframe the frame itself never scrolls, and this moves the
// host page instead. Modified clicks (new tab) keep the link's default.
export const jumpTo = (id) => (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  document.getElementById(id).scrollIntoView();
  history.replaceState(null, "", `#${id}`);
};

// Share: the system share sheet where there is one, otherwise the link is
// copied. If the browser refuses both (an iframe embedded without the
// permissions in the README snippet), the link is shown to copy by hand.
export function ShareButton({ title, text, url }) {
  const [state, setState] = useState("idle"); // idle | copied | manual
  const copy = () => navigator.clipboard.writeText(`${text} ${url}`)
    .then(() => { setState("copied"); setTimeout(() => setState("idle"), 2500); })
    .catch(() => setState("manual"));
  const onClick = () => {
    if (!navigator.share) return copy();
    navigator.share({ title, text, url }).catch((e) => { if (e.name !== "AbortError") copy(); });
  };
  return (
    <span className="share">
      <button type="button" className="share-btn" onClick={onClick}>
        <Share2 size={15} strokeWidth={2.25} aria-hidden="true" />
        {state === "copied" ? "Link copied" : "Share"}
      </button>
      {state === "manual" && <input className="share-url" readOnly value={url} aria-label="Link to share"
        onFocus={(e) => e.target.select()} autoFocus />}
    </span>
  );
}

