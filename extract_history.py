"""Measure the budget book's ten-year "budget to actual" charts into public/history.json.

    python extract_history.py 2027-proposed-budget.pdf public/budget.json public/history.json

The charts are vector drawings: modified budget as bars, actual spending as a line,
against a labeled dollar axis. Each chart is calibrated from its own tick labels and
gridlines, and every bar and line point is converted to dollars. The results are
measurements of a drawing, not figures from a table, so they are rounded to 0.1% of
the chart's axis and kept out of budget.json.

Every chart is checked against budget.json: its last actual point must match the
unit's prior-year actual within TOLERANCE of the axis. KNOWN_MISMATCHES lists the
charts that do not, after checking the page by eye. Anything else raises.
"""
import json
import math
import re
import sys

import pdfplumber

TOLERANCE = 0.25  # percent of the chart's axis

BAR_FILL = (0.059, 0.62, 0.835)      # modified budget
LINE_STROKE = (0.376, 0.102, 0.345)  # actual
GRID_STROKE = 0.851

# Chart title (as printed, before " Expenses Modified Budget to Actual") -> budget unit.
CHART_UNITS = {
    "Council": "Common Council",
    "Mayor's Office": "Mayor's Office",
    "Customer Service": "Customer Service",
    "City County Information Technology Commission": "City County Information Technology Commission",
    "Refuse Collection": "Refuse Collection",
    "Assessment Department": "Assessment",
    "City Attorney": "City Attorney",
    "Human Resources": "Human Resources",
    "Municipal Court": "Municipal Court",
    "Other General Government": "Other General Government",
    "Police Department": "Police",
    "Fire Department": "Fire",
    "Public Works Department": "Public Works",
    "Park, Recreation and Forestry Department": "Parks, Recreation and Forestry",
    "400 Block Fund": "400 Block Riverlife Fund",
    "Animal Control Fund": "Animal Control Fund",
    "Capital Projects Fund": "Capital Projects Fund",
    "Central Purchasing Fund": "Central Capital Purchasing Fund",
    "Community Development Fund": "Community Development Fund",
    "Debt Service Fund": "Debt Service Fund",
    "Economic Development Fund": "Economic Development Fund",
    "Employee Benefit Fund": "Employee Benefit Fund",
    "Environmental Clean Up Fund": "Environmental Clean Up Fund",
    "Hazardous Materials Fund": "Hazardous Materials Contract Fund",
    "Housing Stock Improvement Fund": "Housing Stock Improvement Fund",
    "Liability Insurance Fund": "Liability Insurance Fund",
    "MetroRide Fund": "Metro Ride",
    "Motor Pool Fund": "Motor Pool Fund",
    "Parking Fund": "Parking Fund",
    "Public Access Cable Fund": "Public Access Cable Fund",
    "Recycling Fund": "Recycling Fund",
    "Room Tax Fund": "Room Tax Fund",
    "Tax Incremental District Number Three Fund": "Tax Increment District 3",
    "Tax Incremental District Number Eight Fund": "Tax Increment District 8",
    "Tax Incremental District Number Nine Fund": "Tax Increment District 9",
    "Tax Incremental District Number Ten Fund": "Tax Increment District 10",
    "Tax Incremental District Number Eleven Fund": "Tax Increment District 11",
    "Tax Incremental District Number Twelve Fund": "Tax Increment District 12",
    "Wastewater Utility Fund": "Wastewater Utility",
    "Water Utility Fund": "Water Utility",
    "Wausau Downtown Airport Fund": "Wausau Downtown Airport",
}

# Charts that do not reproduce the unit's prior-year actual, checked by eye.
KNOWN_MISMATCHES = {
    "Other General Government":
        "The chart appears to count spending that this budget's table does not, so its figures are not comparable.",
}
# Charts that stop before the prior year, checked by eye.
KNOWN_SHORT = {
    "Wausau Downtown Airport": "The city's chart ends in 2024.",
}


def color(c):
    return tuple(round(v, 3) for v in c) if isinstance(c, (tuple, list)) else round(c, 3)


def money(s):
    if s == "$-":
        return 0
    if not re.fullmatch(r"\$[\d,]+", s):
        raise ValueError(f"unexpected axis label {s!r}")
    return int(s[1:].replace(",", ""))


def is_book_page(text):
    return "City of Wausau, Wisconsin" in text and "Budget" in text.split("\n")[0]


def frames(page):
    """Each chart sits in a white frame rectangle."""
    return sorted((r for r in page.rects if color(r["non_stroking_color"]) == 1.0
                   and r["width"] > 250 and r["height"] > 150), key=lambda r: r["top"])


def inside(obj, f):
    return f["x0"] - 1 <= obj["x0"] and obj["x1"] <= f["x1"] + 1 and f["top"] - 1 <= obj["top"] and obj["bottom"] <= f["bottom"] + 1


def calibrate(page, f, where):
    """Linear map from y to dollars, fitted to the tick labels on their gridlines."""
    grid = [l for l in page.lines if inside(l, f) and color(l.get("stroking_color")) == GRID_STROKE
            and abs(l["top"] - l["bottom"]) < 0.1 and l["x1"] - l["x0"] > 100]
    ticks = [w for w in page.extract_words() if inside(w, f) and w["text"].startswith("$")]
    pairs = []
    for t in ticks:
        mid = (t["top"] + t["bottom"]) / 2
        g = min(grid, key=lambda l: abs(l["top"] - mid))
        if abs(g["top"] - mid) > 2:
            raise ValueError(f"{where}: tick {t['text']} has no gridline")
        pairs.append((g["top"], money(t["text"])))
    if len(pairs) < 3:
        raise ValueError(f"{where}: only {len(pairs)} axis ticks")
    n = len(pairs)
    my = sum(y for y, _ in pairs) / n
    mv = sum(v for _, v in pairs) / n
    slope = sum((y - my) * (v - mv) for y, v in pairs) / sum((y - my) ** 2 for y, _ in pairs)
    axis_max = max(v for _, v in pairs)
    to_value = lambda y: mv + slope * (y - my)
    worst = max(abs(to_value(y) - v) for y, v in pairs)
    if worst > axis_max * 0.001:
        raise ValueError(f"{where}: axis ticks are not evenly spaced (off by {worst:,.0f})")
    # Bars stand on the lowest tick, which is not always $0 (Refuse Collection starts at $800,000).
    baseline = min(pairs, key=lambda p: p[1])[0]
    return to_value, axis_max, baseline, grid


def measure(page, f, where):
    to_value, axis_max, baseline, grid = calibrate(page, f, where)
    words = [w for w in page.extract_words() if inside(w, f)]
    years = sorted(((int(w["text"]), (w["x0"] + w["x1"]) / 2) for w in words
                    if re.fullmatch(r"20\d\d", w["text"]) and w["top"] > baseline), key=lambda t: t[0])
    if not years or [y for y, _ in years] != list(range(years[0][0], years[-1][0] + 1)):
        raise ValueError(f"{where}: year labels are missing or not consecutive")
    spacing = (years[-1][1] - years[0][1]) / max(len(years) - 1, 1)

    def year_at(x):
        y, cx = min(years, key=lambda t: abs(t[1] - x))
        if abs(cx - x) > spacing / 4:
            raise ValueError(f"{where}: a mark at x={x:.1f} sits between years")
        return y

    budget = {}
    for r in page.rects:
        if inside(r, f) and color(r["non_stroking_color"]) == BAR_FILL and r["width"] < 15 and abs(r["bottom"] - baseline) < 1:
            y = year_at((r["x0"] + r["x1"]) / 2)
            if y in budget:
                raise ValueError(f"{where}: two bars for {y}")
            budget[y] = to_value(r["top"])
    lines = [c for c in page.curves if inside(c, f) and color(c.get("stroking_color")) == LINE_STROKE]
    if len(lines) != 1:
        raise ValueError(f"{where}: expected one actual-spending line, found {len(lines)}")
    actual = {}
    for x, y in lines[0]["pts"]:
        yr = year_at(x)
        if yr in actual:
            raise ValueError(f"{where}: two line points for {yr}")
        actual[yr] = to_value(y)
    if sorted(actual) != [y for y, _ in years]:
        raise ValueError(f"{where}: the actual line does not cover every year")

    words_text = {}
    for w in words:
        words_text.setdefault(round(w["top"]), []).append(w["text"])
    text = " ".join(" ".join(v) for _, v in sorted(words_text.items()))
    m = re.search(r"(.+?) Expenses Modified Budget to Actual", text)
    if not m:
        raise ValueError(f"{where}: no chart title")
    return m.group(1).strip(), [y for y, _ in years], budget, actual, axis_max


def rounded(v, step, axis_max, where):
    if v < -axis_max * TOLERANCE / 100:
        raise ValueError(f"{where}: measured {v:,.0f}, below the axis")
    return int(round(max(v, 0) / step) * step)


def main(pdf_path, budget_path, out_path):
    b = json.load(open(budget_path, encoding="utf-8"))
    units = {u["name"]: u for u in b["units"]}
    prior = b["meta"]["years"]["prior"]
    charts = {}
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if not is_book_page(text) or "budget to actual" not in text.lower():
                continue
            for f in frames(page):
                where = f"page {page.page_number}"
                title, years, budget, actual, axis_max = measure(page, f, where)
                if title not in CHART_UNITS:
                    raise ValueError(f"{where}: unknown chart title {title!r} (add it to CHART_UNITS)")
                unit = CHART_UNITS[title]
                if unit in charts:
                    raise ValueError(f"{where}: a second chart for {unit}")
                step = 10 ** math.floor(math.log10(axis_max / 1000))
                check = None
                if prior in actual:
                    table = units[unit]["total_expenses"]["prior_actual"]
                    err = abs(actual[prior] - table) / axis_max * 100
                    check = {"year": prior, "table": table, "measured": rounded(actual[prior], step, axis_max, where),
                             "error_pct_of_axis": round(err, 3)}
                    if err > TOLERANCE and unit not in KNOWN_MISMATCHES:
                        raise ValueError(f"{where}: {unit} {prior} actual measures {actual[prior]:,.0f}; "
                                         f"the budget table says {table:,} ({err:.2f}% of the axis)")
                    if err <= TOLERANCE and unit in KNOWN_MISMATCHES:
                        raise ValueError(f"{where}: {unit} now matches; remove it from KNOWN_MISMATCHES")
                elif unit not in KNOWN_SHORT:
                    raise ValueError(f"{where}: {unit}'s chart has no {prior}")
                charts[unit] = {
                    "unit": unit,
                    "title": title,
                    "page": page.page_number,
                    "axis_max": axis_max,
                    "precision": step,
                    "years": years,
                    "budget": [rounded(budget[y], step, axis_max, where) if y in budget else None for y in years],
                    "actual": [rounded(actual[y], step, axis_max, where) for y in years],
                    "check": check,
                    "note": KNOWN_MISMATCHES.get(unit) or KNOWN_SHORT.get(unit),
                }
    missing = sorted(set(units) - set(charts))
    if missing:
        raise ValueError(f"no chart found for: {', '.join(missing)}")

    errs = sorted(c["check"]["error_pct_of_axis"] for c in charts.values() if c["check"] and c["unit"] not in KNOWN_MISMATCHES)
    out = {
        "source": {"document": "City of Wausau 2027 proposed budget, historical budget to actual charts",
                   "printed_page_offset": b["meta"]["printed_page_offset"]},
        "method": ("Measured from the city's vector charts: each chart's axis is calibrated from its own labels, "
                   "and each bar and point converted to dollars. Values are approximate and rounded to 0.1% of "
                   "the chart's axis. A missing bar (null) is a year the chart draws no budget bar."),
        "tolerance_pct_of_axis": TOLERANCE,
        "fiscal_year": b["meta"]["fiscal_year"],
        "units": [charts[u["name"]] for u in b["units"]],
    }
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f"{len(charts)} charts; {len(errs)} checked against {prior} actuals, worst error "
          f"{errs[-1]:.3f}% of axis; known exceptions: {len(KNOWN_MISMATCHES) + len(KNOWN_SHORT)} -> {out_path}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
