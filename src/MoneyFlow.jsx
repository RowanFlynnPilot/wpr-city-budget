import React, { useEffect, useRef, useState } from "react";
import { usdCents, pct } from "./format";

/*
 * "Follow your money": the reader's city tax poured, to scale, into the funds
 * it pays for, and the day-to-day services share fanned out into departments.
 *
 *   [ your bill ]                      row 1, centered
 *    /  |   \  \                       ribbons
 *   [ day-to-day  | debt | tif |...]   row 2, the full levy split
 *    /  /   |   \                      ribbons from the day-to-day segment
 *   [police|fire|public works|...]     row 3, general fund departments
 *
 * Plain SVG drawn at the container's measured width, so text never scales.
 * Bar lengths are shares; the dollar labels follow the bill as it is typed.
 */

const GAP = 2;
const BAR = 40;
const TEXT_LIGHT = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";

// Rough text widths for fit tests (Public Sans bold, JetBrains Mono).
const sansW = (s, size) => s.length * size * 0.57;
const monoW = (s, size) => s.length * size * 0.6;

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Reveal once, when the diagram first scrolls into view.
function useSeen(ref) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold: 0.25 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
  return seen;
}

// Lay items left to right across [x0, x0 + width], 2px apart, by share.
function lay(items, x0, width) {
  const usable = width - GAP * (items.length - 1);
  let x = x0;
  return items.map((it) => {
    const w = Math.max(usable * it.share, 1.5);
    const seg = { ...it, x, w };
    x += w + GAP;
    return seg;
  });
}

// A ribbon from [sx0, sx1] at y0 down to [tx0, tx1] at y1.
function ribbon(sx0, sx1, y0, tx0, tx1, y1) {
  const m = (y0 + y1) / 2;
  return `M${sx0},${y0} C${sx0},${m} ${tx0},${m} ${tx0},${y1} L${tx1},${y1} C${tx1},${m} ${sx1},${m} ${sx1},${y0} Z`;
}

// Split a source span by the shares of its targets (no gaps at the source).
function splitSpan(x0, width, items) {
  let x = x0;
  return items.map((it) => { const s = [x, x + width * it.share]; x = s[1]; return s; });
}

// What fits inside a segment: name and amount, a shorter name, the amount alone, or nothing.
function fit(seg, names) {
  const room = seg.w - 12;
  const amt = usdCents(seg.amount);
  for (const name of names) {
    if (Math.max(sansW(name, 12), monoW(amt, 11.5)) <= room) return { name, amt };
  }
  return monoW(amt, 11.5) <= room ? { name: null, amt } : null;
}

function Segment({ seg, y, color, text, label, dim, onEnter, onLeave }) {
  return (
    <g className={"flow-seg" + (dim ? " dim" : "")} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onEnter}>
      <rect x={seg.x} y={y} width={seg.w} height={BAR} rx={seg.w > 8 ? 3 : 0} fill={color} />
      {label && (
        <text x={seg.x + 7} y={y + (label.name ? 17 : 25)} fill={text}>
          {label.name && <tspan className="flow-name">{label.name}</tspan>}
          <tspan className="flow-amt" x={seg.x + 7} dy={label.name ? 15 : 0}>{label.amt}</tspan>
        </text>
      )}
    </g>
  );
}

export default function MoneyFlow({ bill, funds, departments, billLabel, ariaLabel }) {
  const [ref, W] = useWidth();
  const seen = useSeen(ref);
  const [hot, setHot] = useState(null); // {kind: "fund"|"dept", key}

  let svg = null;
  if (W > 0) {
    const R = W < 560 ? 58 : 88;
    const y1 = 0, y2 = BAR + R, y3 = y2 + BAR + R, H = y3 + BAR;
    const billW = Math.min(Math.max(W * 0.34, 156), W);
    const billX = (W - billW) / 2;

    const row2 = lay(funds.map((f) => ({ ...f, amount: bill * f.share })), 0, W);
    const general = row2.find((f) => f.general);
    const row3 = lay(departments.map((d) => ({ ...d, amount: general.amount * d.share })), 0, W);
    const src1 = splitSpan(billX, billW, row2);
    const src2 = splitSpan(general.x, general.w, row3);

    // Highlight: a department lights its own ribbon, the day-to-day segment and its ribbon.
    const litFund = (f) => !hot || (hot.kind === "fund" ? hot.key === f.key : f.general);
    const litDept = (d) => !hot || (hot.kind === "dept" ? hot.key === d.key : hot.key === general.key);
    const enter = (kind, key) => () => setHot({ kind, key });
    const leave = () => setHot(null);

    const billLabelFit = fit({ w: billW, amount: bill }, [billLabel, "Your city tax"]);
    svg = (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={"flow-svg" + (seen ? " in" : "")}
        role="img" aria-label={ariaLabel} onMouseLeave={leave}>
        <g className="flow-layer l1">
          <rect x={billX} y={y1} width={billW} height={BAR} rx={3} fill={TEXT_DARK} />
          {billLabelFit && (
            <text x={billX + 8} y={y1 + 17} fill={TEXT_LIGHT}>
              <tspan className="flow-name">{billLabelFit.name}</tspan>
              <tspan className="flow-amt" x={billX + 8} dy={15}>{billLabelFit.amt}</tspan>
            </text>
          )}
        </g>
        <g className="flow-layer r1">
          {row2.map((f, i) => (
            <path key={f.key} d={ribbon(src1[i][0], src1[i][1], y1 + BAR, f.x, f.x + f.w, y2)}
              fill={f.color} className={"flow-rib" + (litFund(f) ? "" : " dim")} />
          ))}
        </g>
        <g className="flow-layer l2">
          {row2.map((f) => (
            <Segment key={f.key} seg={f} y={y2} color={f.color} text={f.ink ? TEXT_DARK : TEXT_LIGHT}
              label={fit(f, [f.label, f.short])} dim={!litFund(f)} onEnter={enter("fund", f.key)} onLeave={leave} />
          ))}
        </g>
        <g className="flow-layer r2">
          {row3.map((d, i) => (
            <path key={d.key} d={ribbon(src2[i][0], src2[i][1], y2 + BAR, d.x, d.x + d.w, y3)}
              fill={general.color} className={"flow-rib" + (litDept(d) ? "" : " dim")} />
          ))}
        </g>
        <g className="flow-layer l3">
          {row3.map((d) => (
            <Segment key={d.key} seg={d} y={y3} color={general.color} text={TEXT_LIGHT}
              label={fit(d, [d.label, d.short])} dim={!litDept(d)} onEnter={enter("dept", d.key)} onLeave={leave} />
          ))}
        </g>
      </svg>
    );

    const tipSeg = hot && (hot.kind === "fund" ? row2.find((f) => f.key === hot.key) : row3.find((d) => d.key === hot.key));
    if (tipSeg) {
      const left = Math.max(110, Math.min(tipSeg.x + tipSeg.w / 2, W - 110));
      const top = hot.kind === "fund" ? y2 : y3;
      svg = (
        <>
          {svg}
          <div className="flow-tip" style={{ left, top }} role="status">
            <b>{tipSeg.label}</b>
            <span>{usdCents(tipSeg.amount)} &middot; {pct(tipSeg.share * 100)} of {hot.kind === "fund" ? "your city tax" : "day-to-day services"}</span>
          </div>
        </>
      );
    }
  }

  return <div className="flow" ref={ref}>{svg}</div>;
}
