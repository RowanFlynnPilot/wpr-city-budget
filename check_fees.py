"""Check public/fees.json against the fee schedules in the budget PDF.

    python check_fees.py 2027-proposed-budget.pdf public/fees.json

fees.json is written by hand. This script rebuilds every table row on the fee
schedule pages from the PDF's ruling lines and text layer, then checks that:

  1. each listed change is a real row: its printed 2027 and 2026 cells, label
     and section heading all sit together in one row of the cited page;
  2. each change's dollar amounts match its printed cells;
  3. nothing is missing: every row whose two years differ is listed (as a
     change or as unclear) or is in IGNORED below with a reason.

Any failure raises and names the fee and page. Prints a summary on success.
"""
import json
import re
import sys

import pdfplumber

# Rows whose two years differ but are not reader-facing fee changes, each with a
# reason. Keyed by (page, normalized label), or for a row with no label of its
# own, by (page, "", normalized budget-year cell) so only that cell is excused.
IGNORED = {
    (262, "soundandlightingsystem(400block)"):
        "Duplicate of the page 261 rate (listed once, from page 261).",
    (253, "", "permitlevel6only:monthly=5seasonalavailability"):
        "The updated book adds “only” to the 2027 cell; the rate stays $5 a month.",
}

KINDS = {"rate", "removed", "restructured"}

# Row boundaries the PDF does not draw (checked against the page images):
# page -> y positions between text lines.
EXTRA_CUTS = {
    255: [566.0, 578.0],  # contractor parking permit | DEPARTMENT: FINANCE | NSF check charge
    # ticketed event safety fee | police services per hour (the updated book; the packet's
    # cut was 456.0, before the city removed the two repeated Memorial rows above it)
    262: [431.2],
}


def norm(s):
    """Whitespace-insensitive, and blind to $, commas and trailing .00, so 1200 == $1,200.00."""
    s = re.sub(r"\s+", "", s or "").lower()
    s = s.replace("$", "").replace(",", "")
    return re.sub(r"\.00(?!\d)", "", s)


def squash(s):
    return re.sub(r"\s+", " ", s or "").strip()


def columns(page):
    """Column x-ranges from the header row's rule segments, and which holds which year."""
    rules = [e for e in page.horizontal_edges if 90 < e["top"] < 100 and e["x1"] - e["x0"] > 30]
    segs = sorted((e["x0"], e["x1"]) for e in rules)
    if len(segs) not in (3, 4):
        raise ValueError(f"page {page.page_number}: expected 3 or 4 header columns, found {len(segs)}")
    head = [w for w in page.extract_words() if 95 < w["top"] < 112]
    years = {}
    for x0, x1 in segs[1:]:
        found = [w["text"] for w in head if x0 - 2 <= w["x0"] < x1 and re.fullmatch(r"20\d\d", w["text"])]
        if found:
            years[found[0]] = (x0, x1)
    if len(years) != 2:
        raise ValueError(f"page {page.page_number}: could not find both year columns in the header")
    return segs[0], years


def rows(page):
    """Table rows between ruling lines: label text and each year's cell text.

    A row is cut wherever a rule crosses the label column or a year column (some
    rows are ruled in only one of them). Full-width notes, whose words run across
    column edges, are marked prose: they are not fees.
    """
    label_col, years = columns(page)
    spans = [label_col] + list(years.values())
    cuts = sorted({round(e["top"], 1) for e in page.horizontal_edges if e["top"] > 100
                   and any(e["x0"] <= a + 2 and e["x1"] >= b - 2 for a, b in spans)}
                  | set(EXTRA_CUTS.get(page.page_number, [])))
    words = page.extract_words()
    edges = [a for a, _ in years.values()]
    out = []
    for top, bottom in zip(cuts, cuts[1:]):
        def cell(xa, xb):
            return squash(page.within_bbox((xa - 1, top - 0.5, xb + 1, bottom + 0.5)).extract_text())
        inside = [w for w in words if top - 0.5 <= w["top"] and w["bottom"] <= bottom + 0.5]
        row = {
            "top": top,
            "label": cell(*label_col),
            "prose": any(w["x0"] < x - 1 < w["x1"] for w in inside for x in edges),
        }
        for y, (a, b) in years.items():
            row[y] = cell(a, b)
        out.append(row)
    return out


def amount_in(text, value):
    """Does the printed cell carry this dollar amount?"""
    a = abs(value)
    forms = {f"{a:,.2f}", f"{a:.2f}"} | ({f"{int(a):,}", str(int(a))} if a == int(a) else set())
    return any(re.search(rf"(?<![\d.]){re.escape(f)}(?![\d])", text.replace("$", "")) for f in forms)


def main(pdf_path, fees_path):
    fees = json.load(open(fees_path, encoding="utf-8"))
    src, yrs = fees["source"], fees["years"]
    cur, bud = str(yrs["current"]), str(yrs["budget"])
    pages = range(src["first_page"], src["last_page"] + 1)

    table = {}  # page -> rows, each with the section heading in force (carried across pages)
    heading = None
    with pdfplumber.open(pdf_path) as pdf:
        for n in pages:
            page_rows = rows(pdf.pages[n - 1])
            for r in page_rows:
                if r["label"] and not r[cur] and not r[bud] and not r["prose"]:
                    heading = r["label"]
                r["heading"] = heading
            table[n] = page_rows

    def find(entry, where, need_budget_empty=False):
        rs = table.get(entry["page"])
        if rs is None:
            raise ValueError(f"{where}: page {entry['page']} is outside the fee schedule")
        hits = [r for r in rs
                if norm(r[cur]) == norm(entry["current_text"])
                and (not r[bud] if need_budget_empty else norm(r[bud]) == norm(entry["budget_text"]))
                and norm(r["label"]) == norm(entry["label"])
                and (entry.get("section") is None or norm(r["heading"]) == norm(entry["section"]))]
        if not hits:
            raise ValueError(f"{where}: no row on page {entry['page']} with label {entry['label']!r}, "
                             f"section {entry.get('section')!r}, {bud} {entry.get('budget_text')!r}, {cur} {entry['current_text']!r}")
        return hits

    covered = set()
    count = 0
    for g in fees["groups"]:
        for c in g["changes"]:
            where = f"{g['name']}: {c['fee']}" + (f" ({c['detail']})" if c.get("detail") else "")
            if c["kind"] not in KINDS:
                raise ValueError(f"{where}: unknown kind {c['kind']!r}")
            if c["kind"] == "rate":
                if c["current"] is None or c["budget"] is None or c["current"] == c["budget"]:
                    raise ValueError(f"{where}: a rate change needs two different amounts")
                for side, text in ((c["current"], c["current_text"]), (c["budget"], c["budget_text"])):
                    if not amount_in(text, side):
                        raise ValueError(f"{where}: {side} is not in the printed cell {text!r}")
            for r in find(c, where):
                covered.add((c["page"], r["top"]))
            count += 1
    for u in fees["unclear"]:
        for r in find(u, f"unclear: {u['fee']}", need_budget_empty=True):
            covered.add((u["page"], r["top"]))

    missing = []
    for n, rs in table.items():
        for r in rs:
            if r["prose"] or norm(r[cur]) == norm(r[bud]) or (n, r["top"]) in covered:
                continue
            if (n, norm(r["label"])) in IGNORED or (n, "", norm(r[bud])) in IGNORED and not r["label"]:
                continue
            missing.append(f"page {n}: {r['label'] or '(no label)'} | {bud}: {r[bud]!r} | {cur}: {r[cur]!r}")
    if missing:
        raise ValueError("rows that change but are not in fees.json:\n  " + "\n  ".join(missing))

    print(f"fees.json OK: {count} changes and {len(fees['unclear'])} unclear rows match pages "
          f"{src['first_page']}-{src['last_page']}; no unlisted changes")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
