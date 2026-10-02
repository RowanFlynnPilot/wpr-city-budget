import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { usd } from "./format";

// Chart colors. Validated with the dataviz palette checker against the cream
// surface: teal (brand) / blue / ochre pass CVD and normal-vision separation in
// this order; the warm gray is the deliberate neutral for "all other funds".
// Ochre and gray sit under 3:1 against the surface, so every chart here ships
// with a legend and a table of the same numbers.
export const SERIES = { teal: "#3A867C", blue: "#2E5C9A", ochre: "#C9922E", gray: "#77706A" };
const SURFACE = "#F6F2E9";
const GRID = "#E3DDD0";
const AXIS_TEXT = "#5E5A52";

const millions = (v) => (v === 0 ? "$0" : "$" + v / 1e6 + "M");
const axisTick = { fill: AXIS_TEXT, fontSize: 12, fontFamily: "JetBrains Mono, ui-monospace, monospace" };

export function Legend({ series }) {
  return (
    <ul className="legend">
      {series.map((s) => (
        <li key={s.key}><i className="legend-sw" style={{ background: s.color }} aria-hidden="true" />{s.label}</li>
      ))}
    </ul>
  );
}

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

// Clean y-axis ticks: multiples of `step` from zero to just above the tallest column.
function ticksFor(rows, step) {
  const top = Math.ceil(Math.max(...rows.map((r) => r.total)) / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

// Stacked columns over time. `rows` are {year, total, [series.key]: amount}.
// Only the top segment gets the 4px rounded data-end; every segment is
// separated by a 2px surface gap.
export function StackedColumns({ rows, series, totalLabel, step, height = 280, ariaLabel, barSize = 24 }) {
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
