import React from "react";
import {
  ResponsiveContainer, BarChart, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { usd } from "./format";
import { HISTORY } from "./charts";

// The recharts-drawn charts. recharts is the page's largest library and no
// chart is on screen at first, so this module loads after the first render;
// sections use the wrappers in charts.jsx.
const SURFACE = "#F6F2E9";
const GRID = "#E3DDD0";
const AXIS_TEXT = "#5E5A52";

const millions = (v) => (v === 0 ? "$0" : "$" + v / 1e6 + "M");

// Axis money at any scale: $0, $50K, $2.5M.
const axisMoney = (v) => (v === 0 ? "$0" : v >= 1e6 ? "$" + +(v / 1e6).toFixed(1) + "M" : "$" + +(v / 1e3).toFixed(0) + "K");

// Four or five clean ticks from zero to just above `max`.
function niceTicks(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}
const axisTick = { fill: AXIS_TEXT, fontSize: 12, fontFamily: "JetBrains Mono, ui-monospace, monospace" };

function StackTip({ active, payload, label, series, totalLabel }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="tip">
      <div className="tip-title">{label}</div>
      {[...series].reverse().map((s) => (
        <div className="tip-row" key={s.key}>
          <span><i className="legend-sw" style={{ background: s.color }} aria-hidden="true" />{s.label}</span>
          <b>{usd(row[s.key])}</b>
        </div>
      ))}
      <div className="tip-row tip-total"><span>{totalLabel}</span><b>{usd(row.total)}</b></div>
    </div>
  );
}

function HistoryTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="tip">
      <div className="tip-title">{label}</div>
      <div className="tip-row"><span><i className="legend-sw" style={{ background: HISTORY.budget }} aria-hidden="true" />Budget</span><b>{row.budget === null ? "none" : "~" + axisMoney(row.budget)}</b></div>
      <div className="tip-row"><span><i className="legend-sw" style={{ background: HISTORY.actual }} aria-hidden="true" />Actual</span><b>{"~" + axisMoney(row.actual)}</b></div>
    </div>
  );
}

// Budget as bars, actual spending as a line, and the coming year's proposal as a
// dashed reference line. Values are measured from the city's charts (approximate).
export function HistoryChart({ rows, proposed, height, ariaLabel }) {
  const top = Math.max(proposed, ...rows.map((r) => Math.max(r.budget ?? 0, r.actual)));
  const ticks = niceTicks(top || 1);
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 14, right: 16, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="year" tick={axisTick} axisLine={{ stroke: GRID }} tickLine={false} interval="preserveStartEnd" minTickGap={4} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={52}
            ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
          <Tooltip content={<HistoryTip />} cursor={{ fill: "rgba(50,55,60,.06)" }} />
          <Bar dataKey="budget" fill={HISTORY.budget} maxBarSize={20} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Line dataKey="actual" stroke={HISTORY.actual} strokeWidth={2} isAnimationActive={false}
            dot={{ r: 4, fill: HISTORY.actual, stroke: "#FFFFFF", strokeWidth: 2 }} activeDot={{ r: 5 }} />
          {/* Named in the legend, not on the line: an inline label collides with low bars. */}
          <ReferenceLine y={proposed} stroke={HISTORY.proposed} strokeDasharray="5 4" strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Clean y-axis ticks: multiples of `step` from zero to just above the tallest column.
function ticksFor(rows, step) {
  const top = Math.ceil(Math.max(...rows.map((r) => r.total)) / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

// Stacked columns over time. `rows` are {year, total, [series.key]: amount}.
// Only the top segment gets the 4px rounded data-end; every segment is
// separated by a 2px surface gap.
export function StackedColumns({ rows, series, totalLabel, step, height, ariaLabel, barSize = 24 }) {
  const ticks = ticksFor(rows, step);
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barCategoryGap="18%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="year" tick={axisTick} axisLine={{ stroke: GRID }} tickLine={false}
            interval="preserveStartEnd" minTickGap={6} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={millions} width={52}
            ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
          <Tooltip content={<StackTip series={series} totalLabel={totalLabel} />}
            cursor={{ fill: "rgba(50,55,60,.06)" }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} stackId="s" fill={s.color} maxBarSize={barSize}
              stroke={SURFACE} strokeWidth={2} isAnimationActive={false}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
