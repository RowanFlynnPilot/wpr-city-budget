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
const PAD = 7;          // text inset inside a segment
const LINE = 14;        // label line height
const TEXT_LIGHT = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const NAME_FONT = '700 12px "Public Sans"';
const AMT_FONT = '500 11.5px "JetBrains Mono"';

// Text widths measured with the page's own fonts, so a label is placed only
// where it truly fits.
const ctx = document.createElement("canvas").getContext("2d");
function textWidth(text, font) {
  ctx.font = font;
  return ctx.measureText(text).width;
}

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

// Measure only once the web fonts are in; before that, widths are the fallback's.
function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => { document.fonts.ready.then(() => setReady(true)); }, []);
  return ready;
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

// A name broken at a space into two lines that each fit, or null.
function wrapTwo(name, room) {
  const words = name.split(" ");
  for (let i = words.length - 1; i > 0; i--) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    if (textWidth(a, NAME_FONT) <= room && textWidth(b, NAME_FONT) <= room) return [a, b];
  }
  return null;
}

// The label that fits inside a segment, best first: a name on one line, a
// name wrapped onto two, then the amount alone, each tried at the normal inset
// and then a tighter one for narrow segments. Null when not even the amount fits.
function fit(w, amount, names) {
  const amt = usdCents(amount);
  let best = null;
  for (const pad of [PAD, 4]) {
    const room = w - pad * 2;
    if (textWidth(amt, AMT_FONT) > room) continue;
    for (const n of names) if (textWidth(n, NAME_FONT) <= room) return { lines: [n], amt, pad };
    for (const n of [...names].reverse()) { const two = wrapTwo(n, room); if (two) return { lines: two, amt, pad }; }
    best = best || { lines: [], amt, pad };
  }
  return best;
}

// Blocks this large (share of their row) always get a label: inside if it
// fits, otherwise a callout beneath the row with a leader line.
const CALLOUT_MIN = 0.05;
const LANE = 40; // height a row of callouts adds below its bar

// Callouts for the large blocks whose names did not fit inside: left to right,
// each centered under its block where room allows, never overlapping the one
// before and never left of minX (under row 2, the day-to-day stream runs down
// through the lane). Every callout in a row uses full names if all of them fit,
// otherwise short names. A callout replaces the block's amount-only label.
function placeCallouts(segs, labels, W, minX = 0) {
  const wanted = segs.map((s, i) => ({ s, i }))
    .filter(({ s, i }) => !(labels[i] && labels[i].lines.length) && s.share >= CALLOUT_MIN);
  const attempt = (nameOf) => {
    const out = [];
    let right = minX - 8;
    for (const { s, i } of wanted) {
      const name = nameOf(s), amt = usdCents(s.amount), cx = s.x + s.w / 2;
      const w = Math.max(textWidth(name, NAME_FONT), textWidth(amt, AMT_FONT));
      let x = Math.max(cx - w / 2, right + 8);
      if (x + w > W) x = W - w;
      if (x < right + 8) continue;
      out.push({ key: s.key, i, name, amt, x, w, cx });
      right = x + w;
    }
    return out;
  };
  const full = attempt((s) => s.label);
  const placed = full.length === wanted.length ? full : attempt((s) => s.short);
  placed.forEach((c) => { labels[c.i] = null; });
  return placed;
}

function Callouts({ items, rowBottom, dimmed, onEnter, onLeave }) {
  const top = rowBottom + 8;
  return items.map((c) => {
    const anchor = Math.max(c.x + 2, Math.min(c.cx, c.x + c.w - 2));
    return (
      <g key={c.key} className={"flow-callout" + (dimmed(c.key) ? " dim" : "")}
        onMouseEnter={onEnter(c.key)} onMouseLeave={onLeave} onClick={onEnter(c.key)}>
        <path d={`M${c.cx},${rowBottom} L${c.cx},${rowBottom + 3} L${anchor},${top}`} className="flow-leader" />
        <text x={c.x} y={top + 12} fill={TEXT_DARK}>
          <tspan className="flow-name">{c.name}</tspan>
          <tspan className="flow-amt" x={c.x} dy={LINE + 1}>{c.amt}</tspan>
        </text>
      </g>
    );
  });
}

// Bar height for the tallest label in a row: name lines plus the amount line.
const barHeight = (labels) => Math.max(40, 12 + LINE * (1 + Math.max(0, ...labels.map((l) => (l ? l.lines.length : 0)))));

function Label({ x, y, h, label, fill }) {
  if (!label) return null;
  const first = label.lines.length ? y + 17 : y + h / 2 + 4;
  const tx = x + label.pad;
  return (
    <text x={tx} y={first} fill={fill}>
      {label.lines.map((l, i) => <tspan key={i} className="flow-name" x={tx} dy={i ? LINE : 0}>{l}</tspan>)}
      <tspan className="flow-amt" x={tx} dy={label.lines.length ? LINE + 1 : 0}>{label.amt}</tspan>
    </text>
  );
}

function Segment({ seg, y, h, color, text, label, dim, onEnter, onLeave }) {
  return (
    <g className={"flow-seg" + (dim ? " dim" : "")} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onEnter}>
      <rect x={seg.x} y={y} width={seg.w} height={h} rx={seg.w > 8 ? 3 : 0} fill={color} />
      <Label x={seg.x} y={y} h={h} label={label} fill={text} />
    </g>
  );
}

export default function MoneyFlow({ bill, funds, departments, billLabel, ariaLabel }) {
  const [ref, W] = useWidth();
  const fontsReady = useFontsReady();
  const seen = useSeen(ref);
  const [hot, setHot] = useState(null); // {kind: "fund"|"dept", key}

  let svg = null;
  if (W > 0 && fontsReady) {
    const R = W < 560 ? 58 : 88;
    const billW = Math.min(Math.max(W * 0.34, 156), W);
    const billX = (W - billW) / 2;

    const row2 = lay(funds.map((f) => ({ ...f, amount: bill * f.share })), 0, W);
    const general = row2.find((f) => f.general);
    const row3 = lay(departments.map((d) => ({ ...d, amount: general.amount * d.share })), 0, W);
    const src1 = splitSpan(billX, billW, row2);
    const src2 = splitSpan(general.x, general.w, row3);

    // Labels first: each row is as tall as its tallest label needs.
    const billLabel1 = fit(billW, bill, [billLabel, "Your city tax"]);
    const labels2 = row2.map((f) => fit(f.w, f.amount, [f.label, f.short]));
    const labels3 = row3.map((d) => fit(d.w, d.amount, [d.label, d.short]));
    const callouts2 = placeCallouts(row2, labels2, W, general.x + general.w + 6);
    const callouts3 = placeCallouts(row3, labels3, W);
    const h1 = barHeight([billLabel1]), h2 = barHeight(labels2), h3 = barHeight(labels3);
    // A callout lane under a row pushes everything below it down; under row 2 the
    // day-to-day stream runs straight through the lane before it fans out.
    const lane2 = callouts2.length ? LANE : 0, lane3 = callouts3.length ? LANE : 0;
    const y1 = 0, y2 = h1 + R, y3 = y2 + h2 + lane2 + R, H = y3 + h3 + lane3;

    // Highlight: a department lights its own ribbon, the day-to-day segment and its ribbon.
    const litFund = (f) => !hot || (hot.kind === "fund" ? hot.key === f.key : f.general);
    const litDept = (d) => !hot || (hot.kind === "dept" ? hot.key === d.key : hot.key === general.key);
    const enter = (kind, key) => () => setHot({ kind, key });
    const leave = () => setHot(null);

    svg = (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={"flow-svg" + (seen ? " in" : "")}
        role="img" aria-label={ariaLabel} onMouseLeave={leave}>
        <g className="flow-layer l1">
          <rect x={billX} y={y1} width={billW} height={h1} rx={3} fill={TEXT_DARK} />
          <Label x={billX} y={y1} h={h1} label={billLabel1} fill={TEXT_LIGHT} />
        </g>
        <g className="flow-layer r1">
          {row2.map((f, i) => (
            <path key={f.key} d={ribbon(src1[i][0], src1[i][1], y1 + h1, f.x, f.x + f.w, y2)}
              fill={f.color} className={"flow-rib" + (litFund(f) ? "" : " dim")} />
          ))}
        </g>
        <g className="flow-layer l2">
          {row2.map((f, i) => (
            <Segment key={f.key} seg={f} y={y2} h={h2} color={f.color} text={f.ink ? TEXT_DARK : TEXT_LIGHT}
              label={labels2[i]} dim={!litFund(f)} onEnter={enter("fund", f.key)} onLeave={leave} />
          ))}
          <Callouts items={callouts2} rowBottom={y2 + h2} onLeave={leave}
            dimmed={(k) => !litFund(row2.find((f) => f.key === k))} onEnter={(k) => enter("fund", k)} />
        </g>
        <g className="flow-layer r2">
          {lane2 > 0 && (
            <rect x={general.x} y={y2 + h2} width={general.w} height={lane2} fill={general.color}
              className={"flow-rib" + (!hot || hot.kind === "dept" || hot.key === general.key ? "" : " dim")} />
          )}
          {row3.map((d, i) => (
            <path key={d.key} d={ribbon(src2[i][0], src2[i][1], y2 + h2 + lane2, d.x, d.x + d.w, y3)}
              fill={general.color} className={"flow-rib" + (litDept(d) ? "" : " dim")} />
          ))}
        </g>
        <g className="flow-layer l3">
          {row3.map((d, i) => (
            <Segment key={d.key} seg={d} y={y3} h={h3} color={general.color} text={TEXT_LIGHT}
              label={labels3[i]} dim={!litDept(d)} onEnter={enter("dept", d.key)} onLeave={leave} />
          ))}
          <Callouts items={callouts3} rowBottom={y3 + h3} onLeave={leave}
            dimmed={(k) => !litDept(row3.find((d) => d.key === k))} onEnter={(k) => enter("dept", k)} />
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
