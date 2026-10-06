"""
extract_budget.py - City of Wausau budget extractor (Wausau Pilot & Review).

Turns the city's annual budget PDF into one budget.json for the budget tool.

The budget moves through stages (mayor's proposed -> Finance Committee
recommended -> Council adopted). The stage and fiscal year are read from the
document's own page header, so the JSON always says which book it came from.
Whether the city reissues the full book after each stage is not known; if it
does, run this on the new PDF. This is a manual ingest, not a scheduled scraper.

    python extract_budget.py 2027-proposed-budget.pdf public/budget.json

Design notes:
- extract_text() + line parsing, not extract_tables(): the tables are
  whitespace-aligned with no ruling lines, and the text layer is clean.
- Every table is reconciled against the totals printed in the document. Where
  the document's own numbers do not add up, the run stops and says where.
  KNOWN_DISCREPANCIES lists the mismatches that exist in the source PDF itself;
  each one is carried into the JSON so the newsroom can see and ask about it.
"""
import sys
import re
import json
from operator import itemgetter

import pdfplumber
from pdfplumber.utils import cluster_objects

VALUE = re.compile(r"^\(?-?\d[\d,]*(\.\d+)?%?\)?$|^-$")
RUNNING_HEADER = re.compile(r"City of Wausau, Wisconsin \|? ?(\w+) Budget (\d{4})")
PRINTED_PAGE = re.compile(r"^(\d+) City of Wausau|Budget \d{4} (\d+)$")
PACKET_FOOTER = re.compile(r"\nPage \d+ of \d+\s*$")

# Section tab printed sideways in the page margin. On left-hand pages the text
# layer returns it reversed, so both spellings are listed. "Revenu" is the
# document's own truncation on two pages.
TAB_WORDS = {
    "General", "Fund", "Special", "Revenue", "Revenu", "Funds", "Debt",
    "Service", "Capital", "Projects", "Internal", "Enterprise",
}
FUND_GROUPS = {
    "General Fund": "General Fund",
    "Special Revenue Funds": "Special Revenue Funds",
    "Special Revenu Funds": "Special Revenue Funds",
    "Debt Service Fund": "Debt Service Fund",
    "Capital Projects Funds": "Capital Projects Funds",
    "Internal Service Funds": "Internal Service Funds",
    "Enterprise Funds": "Enterprise Funds",
}

# Page titles are set in small caps, which the text layer returns with scrambled
# case, so display names are keyed off the upper-cased title.
UNIT_NAMES = {
    "COMMON COUNCIL": "Common Council",
    "MAYOR’S OFFICE": "Mayor's Office",
    "CUSTOMER SERVICE DEPARTMENT": "Customer Service",
    "CITY COUNTY INFORMATION TECHNOLOGY COMMISSION": "City County Information Technology Commission",
    "REFUSE COLLECTION": "Refuse Collection",
    "ASSESSMENT DEPARTMENT": "Assessment",
    "CITY ATTORNEY": "City Attorney",
    "HUMAN RESOURCES": "Human Resources",
    "MUNICIPAL COURT": "Municipal Court",
    "OTHER GENERAL GOVERNMENT": "Other General Government",
    "POLICE DEPARTMENT": "Police",
    "FIRE DEPARTMENT": "Fire",
    "PUBLIC WORKS DEPARTMENT": "Public Works",
    "PARK, RECREATION AND FORESTRY DEPARTMENT": "Parks, Recreation and Forestry",
    "ENVIRONMENTAL CLEAN UP FUND": "Environmental Clean Up Fund",
    "COMMUNITY DEVELOPMENT FUND": "Community Development Fund",
    "ROOM TAX FUND": "Room Tax Fund",
    "PUBLIC ACCESS CABLE FUND": "Public Access Cable Fund",
    "RECYCLING FUND": "Recycling Fund",
    "ECONOMIC DEVELOPMENT FUND": "Economic Development Fund",
    "ANIMAL CONTROL FUND": "Animal Control Fund",
    "400 BLOCK RIVERLIFE FUND": "400 Block Riverlife Fund",
    "HAZARDOUS MATERIALS CONTRACT FUND": "Hazardous Materials Contract Fund",
    "HOUSING STOCK IMPROVEMENT FUND": "Housing Stock Improvement Fund",
    "DEBT SERVICE FUND": "Debt Service Fund",
    "CAPITAL PROJECTS FUND": "Capital Projects Fund",
    "CENTRAL CAPITAL PURCHASING FUND": "Central Capital Purchasing Fund",
    "TAX INCREMENT DISTRICT NUMBER THREE FUND": "Tax Increment District 3",
    "TAX INCREMENT DISTRICT NUMBER EIGHT FUND": "Tax Increment District 8",
    "TAX INCREMENT DISTRICT NUMBER NINE FUND": "Tax Increment District 9",
    "TAX INCREMENT DISTRICT NUMBER TEN FUND": "Tax Increment District 10",
    "TAX INCREMENT DISTRICT NUMBER ELEVEN FUND": "Tax Increment District 11",
    "TAX INCREMENT DISTRICT NUMBER TWELVE FUND": "Tax Increment District 12",
    "MOTOR POOL FUND": "Motor Pool Fund",
    "LIABILITY INSURANCE FUND": "Liability Insurance Fund",
    "EMPLOYEE BENEFIT FUND": "Employee Benefit Fund",
    "WAUSAU WATER WORKS": "Water Utility",
    "WAUSAU WATER WORKS / WASTEWATER": "Wastewater Utility",
    "METRO RIDE FUND": "Metro Ride",
    "PARKING FUND": "Parking Fund",
    "WAUSAU DOWNTOWN AIRPORT FUND": "Wausau Downtown Airport",
}

UNIT_COLS = [
    "prior_actual",        # last completed year, actual
    "current_adopted",     # current year, adopted budget
    "current_modified",    # current year, modified budget
    "current_estimated",   # current year, estimated actual
    "requested",           # budget year, department request
    "recommended",         # budget year, executive recommended
    "proposed",            # budget year, proposed
]
GF_COLS = ["current_adopted", "current_modified", "current_estimated", "budget", "change", "change_pct"]

# The general fund statement and the levy table name things differently from
# the budget pages. These maps tie each row to its budget unit so the tables
# can be checked against each other and joined in the frontend.
GF_STATEMENT_UNITS = {
    "Council": "Common Council",
    "Mayor": "Mayor's Office",
    "Customer Service": "Customer Service",
    "City County Information Technology": "City County Information Technology Commission",
    "Property Assessment": "Assessment",
    "Legal Affairs": "City Attorney",
    "Human Resources": "Human Resources",
    "Municipal Court": "Municipal Court",
    "Other General Government": "Other General Government",
    "Police Department": "Police",
    "Fire Department": "Fire",
    "Public Works": "Public Works",
    "Refuse Collection": "Refuse Collection",
    "Parks Operations": "Parks, Recreation and Forestry",
}
LEVY_FUND_UNITS = {
    "General Fund": None,  # the whole general fund, not one unit
    "Community Development": "Community Development Fund",
    "Recycling Fund": "Recycling Fund",
    "Debt Service Fund": "Debt Service Fund",
    "Capital Projects Fund": "Capital Projects Fund",
    "Central Equipment Capital Fund": "Central Capital Purchasing Fund",
    "Animal Control": "Animal Control Fund",
    "MetroRide Fund": "Metro Ride",
    "Parking Fund": "Parking Fund",
    "Wausau Downtown Airport Fund": "Wausau Downtown Airport",
}

CAPITAL_DEPTS = ("Public Works", "Airport", "CCITC", "Parks", "Fire")

# Mismatches that are in the source PDF itself, verified by hand against the
# page. Keyed by the exact reconciliation label. A mismatch not listed here
# stops the run.
KNOWN_DISCREPANCIES = {
    # p. 19 prints the 2024 reserve's budget as 48,014,197; the general fund
    # statement on p. 72 gives 2026 adopted spending as 48,014,200. (The
    # packet's capital-list gap, fixed in the city's updated book, is gone.)
    "fund balance: previous row's budget vs adopted general fund spending": [48014197, 48014200],
}


def number(token):
    """'(203,880)' -> -203880 ; '9.2404' -> 9.2404 ; '-3.33%' -> -3.33 ; '-' -> 0."""
    if token == "-":
        return 0
    negative = token.startswith("(") or token.startswith("-")
    digits = re.sub(r"[^\d.]", "", token)
    value = float(digits) if "." in digits else int(digits)
    return -value if negative else value


def split_row(line):
    """'Fixed Charges $ 74,258 - (12)' -> ('Fixed Charges', [74258, 0, -12])."""
    tokens = line.replace("$", " ").replace("*", " ").split()
    values = []
    while tokens and VALUE.match(tokens[-1]):
        values.insert(0, number(tokens.pop()))
    return " ".join(tokens), values


def last_amount(line):
    """'Reconstruction STH 52 300,000' -> ('Reconstruction STH 52', 300000).

    Only the final token is read as a number, for lists whose descriptions end
    in digits. Returns (line, None) when the line has no trailing amount.
    """
    label, _, last = line.replace("$", " ").strip().rpartition(" ")
    if not VALUE.match(last):
        return line.strip(), None
    return label.strip(), number(last)


def find_page(texts, needle):
    """Index of the single page containing `needle`, ignoring case.

    Headings are set in small caps, which the text layer returns in scrambled
    case, so matching is case-insensitive throughout.
    """
    hits = [i for i, text in enumerate(texts) if needle.upper() in text.upper()]
    if len(hits) != 1:
        raise ValueError(f"expected exactly one page containing {needle!r}, found {len(hits)}: {[h + 1 for h in hits]}")
    return hits[0]


def lines_after(text, needle):
    """Lines of `text` that follow the first line containing `needle`, ignoring case."""
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if needle.upper() in line.upper():
            return lines[i + 1:]
    raise ValueError(f"{needle!r} not found on page")


def table_rows(lines, n_cols, stop=None):
    """Rows of (label, values) with exactly n_cols values.

    A line with no values is the first half of a wrapped label and is joined to
    the row that follows. Reading ends at the first line starting with `stop`,
    or with no `stop`, at the end of the page.
    """
    rows, pending = [], ""
    for line in lines:
        if stop is not None and line.startswith(stop):
            return rows
        label, values = split_row(line)
        if not values:
            pending = f"{pending} {label}".strip()
            continue
        if len(values) != n_cols:
            raise ValueError(f"expected {n_cols} values, got {len(values)}: {line!r}")
        rows.append((f"{pending} {label}".strip(), values))
        pending = ""
    if stop is None:
        return rows
    raise ValueError(f"table never reached {stop!r}")


class Reconciler:
    """Checks parsed rows against the document's printed totals."""

    def __init__(self):
        self.discrepancies = []

    def check(self, label, computed, printed, page, tolerance=0):
        if abs(computed - printed) <= tolerance:
            return
        entry = {"check": label, "page": page, "sum_of_rows": computed, "printed_total": printed}
        if KNOWN_DISCREPANCIES.get(label) != [computed, printed]:
            raise ValueError(f"reconciliation failed: {json.dumps(entry)}")
        self.discrepancies.append(entry)


def body_pages(texts):
    """Page texts with every page lacking the running header blanked out.

    The packet wraps the budget in an agenda, a cover, and trailing layout
    leftovers that repeat some tables. Only pages carrying the document's
    running header are the budget itself. Blanking keeps page numbers intact.
    The packet also stamps "Page N of M" at the foot of each page; the city's
    standalone book has no such line, so it is dropped as packet furniture.
    """
    return [PACKET_FOOTER.sub("", text) if RUNNING_HEADER.search(text.split("\n")[0]) else "" for text in texts]


def parse_meta(texts):
    match = next((RUNNING_HEADER.search(text) for text in texts if text), None)
    if not match:
        raise ValueError("page header with stage and fiscal year not found")
    year = int(match.group(2))
    # Every "page" in the JSON is the page's position in the PDF. The number
    # printed in the page's corner differs when the book is wrapped in a
    # meeting packet: printed page = page - printed_page_offset.
    offsets = set()
    for i, text in enumerate(texts):
        printed = PRINTED_PAGE.search(text.split("\n")[0])
        if printed:
            offsets.add(i + 1 - int(printed.group(1) or printed.group(2)))
    if len(offsets) != 1:
        raise ValueError(f"printed page numbers are not a constant offset from PDF pages: {sorted(offsets)}")
    return {
        "entity": "City of Wausau",
        "stage": match.group(1).lower(),
        "fiscal_year": year,
        "printed_page_offset": offsets.pop(),
        # what the relative column names mean in this document
        "years": {"prior": year - 2, "current": year - 1, "budget": year},
        "pages": len(texts),
    }


def parse_tax_rate(texts):
    page = find_page(texts, "Property Tax Levy $")
    rows = {}
    for line in texts[page].split("\n"):
        label, values = split_row(line)
        if label in ("Property Tax Levy", "Assessed Valuation", "Tax Rate"):
            if len(values) != 3:
                raise ValueError(f"expected 3 values: {line!r}")
            rows[label] = values
    if len(rows) != 3:
        raise ValueError(f"tax rate table incomplete on page {page + 1}")
    keys = ["budget_year", "current_year", "change"]
    return {
        "page": page + 1,
        "levy": dict(zip(keys, rows["Property Tax Levy"])),
        "assessed_valuation": dict(zip(keys, rows["Assessed Valuation"])),
        "rate_per_1000": dict(zip(keys, rows["Tax Rate"])),
        "assessed_valuation_is_estimate": "Estimate final" in texts[find_page(texts, "Equalized Valuation % Increase")],
    }


def parse_valuation(texts):
    page = find_page(texts, "Equalized Valuation % Increase")
    history = []
    for line in texts[page].split("\n"):
        label, values = split_row(line)
        if label == "" and len(values) == 5 and 2000 < values[0] < 2100:
            history.append({"year": values[0], "equalized": values[1], "assessed": values[3]})
    if len(history) < 2:
        raise ValueError(f"valuation history not found on page {page + 1}")
    return {"page": page + 1, "history": history}


def parse_levy_limit(texts):
    page = find_page(texts, "Allowable Levy*")
    history = []
    for line in texts[page].split("\n"):
        match = re.match(r"^(\d{4}) for (\d{4}) (.+)$", line)
        if not match:
            continue
        _, values = split_row(match.group(3))
        if len(values) != 4:
            raise ValueError(f"expected 4 values: {line!r}")
        history.append({
            "budget_year": int(match.group(2)),
            "allowable_levy": values[0],
            "actual_levy": values[1],
            "debt_service_exception": values[2],
            "under_utilized": values[3],
        })
    if not history:
        raise ValueError(f"levy limit rows not found on page {page + 1}")
    return {"page": page + 1, "history": history}


def parse_levy_by_fund(texts, rec):
    page = find_page(texts, "SUMMARY OF PROPERTY TAXES BY FUND")
    lines = lines_after(texts[page], "SUMMARY OF PROPERTY TAXES BY FUND")
    _, years = split_row(lines[0])
    n = len(years)
    rows = table_rows(lines[1:], n, "Increase Over Prior Year")
    funds, named = [], {}
    for label, values in rows:
        if label in ("Subtotal", "Tax Increment", "Total Levy"):
            named[label] = values
            continue
        # group headings ("Enterprise Funds:") wrap into the next row's label
        name = label.split(": ")[-1]
        funds.append({"name": name, "unit": LEVY_FUND_UNITS[name], "values": values})
    for i, year in enumerate(years):
        rec.check(f"levy by fund {year}: funds vs subtotal", sum(f["values"][i] for f in funds), named["Subtotal"][i], page + 1)
        rec.check(f"levy by fund {year}: subtotal + increment vs total", named["Subtotal"][i] + named["Tax Increment"][i], named["Total Levy"][i], page + 1)
    return {
        "page": page + 1,
        "years": years,
        "funds": funds,
        "subtotal": named["Subtotal"],
        "tax_increment": named["Tax Increment"],
        "total": named["Total Levy"],
    }


def parse_general_fund(texts, units, rec):
    """General fund revenues by source, plus the statement's totals.

    Spending by department is not repeated here: it lives in `units`. Each
    statement row is checked against its unit's own budget page instead.
    """
    page = find_page(texts, "COMBINED STATEMENT OF EXPENDITURES - GENERAL FUND")
    rows = table_rows(lines_after(texts[page], "GENERAL GOVERNMENT"), len(GF_COLS))
    by_unit = {u["name"]: u["total_expenses"] for u in units}
    spending, revenues, totals = [], [], {}
    target = spending
    for label, values in rows:
        entry = dict(zip(GF_COLS, values))
        if label == "Total Expenditures":
            totals["expenditures"] = entry
            target = revenues
        elif label == "Total Revenues":
            totals["revenues"] = entry
        else:
            target.append({"name": label, **entry})
    for row in spending:
        unit = by_unit[GF_STATEMENT_UNITS[row["name"]]]
        for statement_col, unit_col in [("current_adopted", "current_adopted"), ("current_modified", "current_modified"),
                                        ("current_estimated", "current_estimated"), ("budget", "proposed")]:
            rec.check(f"general fund statement vs {GF_STATEMENT_UNITS[row['name']]}: {unit_col}", row[statement_col], unit[unit_col], page + 1)
    for col in GF_COLS[:4]:
        rec.check(f"general fund expenditures: {col}", sum(r[col] for r in spending), totals["expenditures"][col], page + 1)
        rec.check(f"general fund revenues: {col}", sum(r[col] for r in revenues), totals["revenues"][col], page + 1)
    return {
        "page": page + 1,
        "total_expenditures": totals["expenditures"],
        "revenues": revenues,
        "total_revenues": totals["revenues"],
    }


def parse_all_funds(texts, year, rec):
    out = {}
    specs = [
        ("revenues_by_category", "REVENUES BY CATEGORY ALL FUNDS", f"{year} Budget {year - 1} Budget", "Total Revenues"),
        ("expenditures_by_category", "BUDGET BY EXPENDITURE CATEGORY - ALL FUNDS", "Budget By Expenditure Category (All Funds)", "Total"),
    ]
    for key, page_needle, header, total_label in specs:
        page = find_page(texts, page_needle)
        rows = table_rows(lines_after(texts[page], header), 2)
        items = [{"name": label, "budget": v[0], "current_budget": v[1]} for label, v in rows if label != total_label]
        total = next(v for label, v in rows if label == total_label)
        rec.check(f"all funds {key}: budget", sum(i["budget"] for i in items), total[0], page + 1)
        rec.check(f"all funds {key}: current_budget", sum(i["current_budget"] for i in items), total[1], page + 1)
        out[key] = {"page": page + 1, "items": items, "total": {"budget": total[0], "current_budget": total[1]}}
    return out


def unit_identity(text):
    """(display name, fund group) from a budget-summary page's margin tab and title."""
    lines = text.split("\n")[1:]
    tab = []
    while lines[0] in TAB_WORDS or lines[0][::-1] in TAB_WORDS:
        tab.append(lines.pop(0))
    if tab[0] not in TAB_WORDS:
        tab = [word[::-1] for word in reversed(tab)]
    title = lines[0].upper()
    if title == "WAUSAU WATER WORKS" and "WASTEWATER DIVISION BUDGET" in text.upper():
        title = "WAUSAU WATER WORKS / WASTEWATER"
    return UNIT_NAMES[title], FUND_GROUPS[" ".join(tab)]


def parse_unit(text, page, year, rec):
    name, group = unit_identity(text)
    lines = text.split("\n")
    start = next(i for i, line in enumerate(lines) if line.upper() == "BUDGET SUMMARY")
    # Two tables carry an extra, empty leading actuals column from a year earlier.
    extra = lines[start + 2].startswith(f"{year - 3} {year - 2}")
    n_cols = len(UNIT_COLS) + (1 if extra else 0)

    expenses, revenues, totals = [], [], {"expenses": None, "revenue": None}
    target, pending = expenses, ""
    for line in lines[start + 4:]:
        upper = line.upper()
        if upper.startswith("BUDGET HIGHLIGHTS") or upper.startswith("PAGE "):
            break
        label, values = split_row(line)
        if not values:
            pending = f"{pending} {label}".strip()
            continue
        if len(values) != n_cols:
            raise ValueError(f"{name} (page {page}): expected {n_cols} values: {line!r}")
        if extra:
            if values[0] != 0:
                raise ValueError(f"{name} (page {page}): extra leading column is not empty: {line!r}")
            values = values[1:]
        label = f"{pending} {label}".strip()
        pending = ""
        entry = dict(zip(UNIT_COLS, values))
        if label == "Total Expenses":
            totals["expenses"] = entry
            target = revenues
        elif label == "Total Revenue":
            totals["revenue"] = entry
            break
        else:
            target.append({"category": label, **entry})

    if totals["expenses"] is None:
        raise ValueError(f"{name} (page {page}): no Total Expenses row")
    for col in UNIT_COLS:
        rec.check(f"{name} expenses: {col}", sum(r[col] for r in expenses), totals["expenses"][col], page)
        if totals["revenue"] is not None:
            rec.check(f"{name} revenue: {col}", sum(r[col] for r in revenues), totals["revenue"][col], page)
    return {
        "name": name,
        "fund_group": group,
        "page": page,
        "expenses": expenses,
        "total_expenses": totals["expenses"],
        "revenues": revenues,
        "total_revenue": totals["revenue"],
    }


def parse_units(texts, year, rec):
    units = [
        parse_unit(text, i + 1, year, rec)
        for i, text in enumerate(texts)
        if "Department Executive" in text and "Request Recommended Proposed" in text
    ]
    names = [u["name"] for u in units]
    missing = sorted(set(UNIT_NAMES.values()) - set(names))
    if missing or len(names) != len(set(names)):
        raise ValueError(f"budget summaries missing {missing} or duplicated in {names}")
    return units


def parse_debt(texts, rec):
    page = find_page(texts, "City - GO Debt Summary")
    schedule, totals = [], None
    for line in lines_after(texts[page], "Year Total Principal"):
        label, values = split_row(line)
        if label == "Totals:":
            totals = values
            break
        if label == "" and len(values) == 4:
            schedule.append({"year": values[0], "principal": values[1], "interest": values[2], "total": values[3]})
    if totals is None:
        raise ValueError(f"GO debt summary totals not found on page {page + 1}")
    # Schedule rows are rounded to whole dollars, so sums can drift from the
    # printed totals by a dollar or two.
    rec.check("GO debt schedule: principal", sum(r["principal"] for r in schedule), totals[0], page + 1, tolerance=2)
    rec.check("GO debt schedule: interest", sum(r["interest"] for r in schedule), totals[1], page + 1, tolerance=2)

    limit_page = find_page(texts, "Legal Debt Margin")
    limit = {}
    for line in texts[limit_page].split("\n"):
        label, values = split_row(line)
        if label in ("Total Allowable Debt", "Outstanding GO Debt", "Legal Debt Margin", "% Utilized") and len(values) == 2:
            limit[label] = values[1]
    if len(limit) != 4:
        raise ValueError(f"debt limit table incomplete on page {limit_page + 1}")
    out_page = find_page(texts, "DEBT OUTSTANDING AS OF")
    as_of = re.search(r"DEBT OUTSTANDING AS OF (.+)", texts[out_page], re.IGNORECASE)
    outstanding = {"as_of": as_of.group(1).title()}
    for line in texts[out_page].split("\n"):
        row_label, row_values = split_row(line)
        if row_label == "Total General Obligation Debt":
            outstanding["general_obligation_undrawn"] = row_values[0]  # authorized, not yet drawn
        label, amount = last_amount(line)
        for key, prefix in [("general_obligation", "Total General Obligation Debt"), ("water_revenue", "Total Water System Revenue Debt"),
                            ("sewer_revenue", "Total Sewer System Revenue Debt"), ("total", "Grand Total")]:
            if label.startswith(prefix):
                outstanding[key] = amount
    if len(outstanding) != 6:
        raise ValueError(f"debt outstanding totals incomplete on page {out_page + 1}")
    rec.check("debt outstanding: categories vs grand total",
              outstanding["general_obligation"] + outstanding["water_revenue"] + outstanding["sewer_revenue"],
              outstanding["total"], out_page + 1)
    # The debt-limit table and the repayment schedule both count general
    # obligation debt as drawn balances plus loans authorized but not yet drawn.
    counted = outstanding["general_obligation"] + outstanding["general_obligation_undrawn"]
    rec.check("GO debt drawn + undrawn vs debt-limit figure", counted, limit["Outstanding GO Debt"], limit_page + 1)
    rec.check("GO debt drawn + undrawn vs repayment schedule principal", counted, totals[0], page + 1)
    return {
        "outstanding": {"page": out_page + 1, **outstanding},
        "go_schedule": {"page": page + 1, "years": schedule, "total_principal": totals[0], "total_interest": totals[1]},
        "limit": {
            "page": limit_page + 1,
            "allowable": limit["Total Allowable Debt"],
            "debt_counted": limit["Outstanding GO Debt"],  # drawn + undrawn general obligation debt
            "margin": limit["Legal Debt Margin"],
            "pct_utilized": limit["% Utilized"],
        },
    }


def parse_capital_projects(texts, rec):
    page = find_page(texts, "The following projects are included in the Capital Projects Fund budget.")
    lines = lines_after(texts[page], "Project Description Dept Total")
    categories, current, total = [], None, None
    funding, total_funding = [], None
    for line in lines:
        label, amount = last_amount(line)
        if total is not None:  # everything after the cost total is a funding source
            if label == "Total Funding":
                total_funding = amount
                break
            funding.append({"source": label, "amount": amount})
        elif amount is None:
            if current is None or "total" in current:
                current = {"name": label, "projects": []}
                categories.append(current)
        elif label == "Total Capital Costs":
            total = amount
        elif label.startswith("Total "):
            rec.check(f"capital projects: {current['name']}", sum(p["amount"] for p in current["projects"]), amount, page + 1)
            current["total"] = amount
        else:
            dept = next((d for d in CAPITAL_DEPTS if label.endswith(" " + d)), None)
            description = label[: -len(dept) - 1] if dept else label
            current["projects"].append({"description": description, "department": dept, "amount": amount})
    if total_funding is None:
        raise ValueError(f"capital projects table incomplete on page {page + 1}")
    rec.check("capital projects: all categories", sum(c["total"] for c in categories), total, page + 1)
    rec.check("capital projects: funding sources", sum(f["amount"] for f in funding), total_funding, page + 1)
    return {"page": page + 1, "categories": categories, "total": total, "funding": funding, "total_funding": total_funding}


def parse_deferred_projects(texts, rec):
    """Capital requests left out of the budget, grouped by department."""
    page = find_page(texts, "DEFERRED PROJECTS:")
    departments, total = [], None
    for line in lines_after(texts[page], "DEFERRED PROJECTS:"):
        label, amount = last_amount(line)
        if amount is None:
            departments.append({"name": label, "projects": []})
        elif label == "":
            total = amount
            break
        else:
            departments[-1]["projects"].append({"description": label, "amount": amount})
    if total is None:
        raise ValueError(f"deferred projects total not found on page {page + 1}")
    rec.check("deferred projects", sum(p["amount"] for d in departments for p in d["projects"]), total, page + 1)
    return {"page": page + 1, "departments": departments, "total": total}


def parse_fund_balance(texts, rec):
    """The general fund's unassigned balance at each year's end, the budget the
    city measures it against, and the reserve goal in its fund balance policy.

    The city pairs each year-end balance with the budget two years later (the
    last row's budget is this book's proposed spending; see cross_check).
    """
    header = "Budget Expenses Percent of Budget"
    page = find_page(texts, header)
    goal = re.search(r"recommends\s+reserves of ([\d.]+)% of expenses", texts[page])
    if not goal:
        raise ValueError(f"fund balance policy goal not found on page {page + 1}")
    years = []
    for line in lines_after(texts[page], header):
        label, values = split_row(line)
        if label or len(values) != 4 or not 2000 < values[0] < 2100:
            break
        year, balance, budget, percent = values
        rec.check(f"fund balance {year}: balance / budget", round(balance / budget * 100, 2), percent, page + 1, tolerance=1e-9)
        years.append({"year": year, "unassigned": balance, "budget_expenses": budget, "percent": percent})
    if len(years) < 2 or any(b["year"] != a["year"] + 1 for a, b in zip(years, years[1:])):
        raise ValueError(f"fund balance years missing or out of order on page {page + 1}: {[y['year'] for y in years]}")
    return {"page": page + 1, "policy_percent": float(goal.group(1)), "years": years}


def parse_motor_pool(texts):
    """The Motor Pool Fund's working capital at each year's end (newest first in
    the book, oldest first here), and the overview's note on why it is low."""
    hits = [i for i, t in enumerate(texts) if "MOTOR POOL FUND" in t.upper() and "WORKING CAPITAL HISTORY" in t.upper()]
    if len(hits) != 1:
        raise ValueError(f"expected one Motor Pool working capital page, found {[h + 1 for h in hits]}")
    page = hits[0]
    history = []
    for line in lines_after(texts[page], "WORKING CAPITAL HISTORY"):
        label, values = split_row(line)
        if label or len(values) != 2 or not 2000 < values[0] < 2100:
            break
        history.append({"year": values[0], "working_capital": values[1]})
    history.reverse()
    if len(history) < 2 or any(b["year"] != a["year"] + 1 for a, b in zip(history, history[1:])):
        raise ValueError(f"motor pool years missing or out of order on page {page + 1}: {[h['year'] for h in history]}")
    note_page = find_page(texts, "No progress was made in increasing the motor pool")
    note = re.search(r"(No progress was made in increasing the motor pool.*?)\n(?=general fund balance)", texts[note_page], re.I | re.S)
    if not note:
        raise ValueError(f"motor pool note not found on page {note_page + 1}")
    return {"page": page + 1, "history": history, "overview_note": {"page": note_page + 1, "text": " ".join(note.group(1).split())}}


def parse_staffing(words, page, rec):
    """Full-time-equivalent positions by department and year.

    Rows have blank cells (a department that did not exist yet), which shifts
    values in the plain text. Columns are therefore assigned by position: each
    number goes to the year heading whose right edge is nearest its own.
    """
    lines = [sorted(line, key=itemgetter("x0")) for line in cluster_objects(words, itemgetter("top"), 3)]
    header = next(i for i, line in enumerate(lines)
                  if len(line) > 5 and all(re.fullmatch(r"20\d\d", w["text"]) for w in line))
    columns = [(w["x1"], int(w["text"])) for w in lines[header]]
    years = [year for _, year in columns]
    departments, totals, pending = [], None, ""
    for line in lines[header + 1:]:
        label = " ".join(w["text"] for w in line if not VALUE.match(w["text"]))
        cells = {min(columns, key=lambda c: abs(c[0] - w["x1"]))[1]: number(w["text"])
                 for w in line if VALUE.match(w["text"])}
        if not cells:
            pending = f"{pending} {label}".strip()
            continue
        values = [cells.get(year) for year in years]  # None where the cell is blank
        if label == "Grand Total":
            totals = values
            break
        departments.append({"name": f"{pending} {label}".strip(), "values": values})
        pending = ""
    if totals is None:
        raise ValueError(f"staffing Grand Total not found on page {page}")
    for i, year in enumerate(years):
        rec.check(f"staffing {year}", round(sum(d["values"][i] or 0 for d in departments), 2), totals[i], page)
    return {"page": page, "years": years, "departments": departments, "total": totals}


def check_arithmetic(budget, rec):
    """Tables with no printed totals still have to obey their own arithmetic.

    These are the headline figures (levy, rate, debt limit), so a misread digit
    must not pass silently.
    """
    rate = budget["tax_rate"]
    for column in ("budget_year", "current_year"):
        rec.check(f"tax rate {column}: levy / assessed value",
                  round(rate["levy"][column] / rate["assessed_valuation"][column] * 1000, 4),
                  rate["rate_per_1000"][column], rate["page"])
    rec.check("assessed value: valuation history vs tax rate table",
              budget["valuation"]["history"][-1]["assessed"],
              rate["assessed_valuation"]["budget_year"], budget["valuation"]["page"])
    for row in budget["levy_limit"]["history"]:
        rec.check(f"levy limit {row['budget_year']}: allowable + debt exception - unused",
                  row["allowable_levy"] + row["debt_service_exception"] - row["under_utilized"],
                  row["actual_levy"], budget["levy_limit"]["page"])
    limit = budget["debt"]["limit"]
    rec.check("debt limit: allowable - counted debt", limit["allowable"] - limit["debt_counted"], limit["margin"], limit["page"])


def cross_check(budget, rec):
    """The separate tables must agree with each other, not just with themselves."""
    units = {u["name"]: u for u in budget["units"]}
    general = [u for u in units.values() if u["fund_group"] == "General Fund"]
    all_funds = budget["all_funds"]
    rec.check("all budget units vs all-funds expenditures",
              sum(u["total_expenses"]["proposed"] for u in units.values()),
              all_funds["expenditures_by_category"]["total"]["budget"],
              all_funds["expenditures_by_category"]["page"])
    rec.check("all budget units vs all-funds revenues",
              sum(u["total_revenue"]["proposed"] for u in units.values() if u["total_revenue"]),
              all_funds["revenues_by_category"]["total"]["budget"],
              all_funds["revenues_by_category"]["page"])
    rec.check("general fund units vs general fund statement",
              sum(u["total_expenses"]["proposed"] for u in general),
              budget["general_fund"]["total_expenditures"]["budget"],
              budget["general_fund"]["page"])

    # Each fund's share of the levy must equal the taxes its own budget counts on.
    levy = budget["levy_by_fund"]
    for fund in levy["funds"]:
        if fund["unit"] is None:
            taxes = next(r for r in budget["general_fund"]["revenues"] if r["name"] == "General Property Taxes")
            pairs = [(fund["values"][-1], taxes["budget"]), (fund["values"][-2], taxes["current_adopted"])]
        else:
            taxes = next(r for r in units[fund["unit"]]["revenues"] if r["category"] == "Taxes")
            pairs = [(fund["values"][-1], taxes["proposed"]), (fund["values"][-2], taxes["current_adopted"])]
        for year, (levy_value, budget_value) in zip(levy["years"][:-3:-1], pairs):
            rec.check(f"levy table vs {fund['name']} budget: {year}", levy_value, budget_value, levy["page"])
    rec.check("levy by fund total vs tax rate levy",
              levy["total"][-1], budget["tax_rate"]["levy"]["budget_year"], budget["tax_rate"]["page"])

    # The capital project list must be the list the Capital Projects Fund pays for.
    fund = units["Capital Projects Fund"]
    capital = budget["capital_projects"]
    rec.check("capital project list vs Capital Projects Fund spending",
              capital["total"],
              sum(r["proposed"] for r in fund["expenses"] if r["category"] != "Debt Service"),
              capital["page"])
    rec.check("capital funding vs Capital Projects Fund revenue",
              capital["total_funding"], fund["total_revenue"]["proposed"], capital["page"])

    # The city measures each year-end reserve against the general fund budget
    # two years later: the last row's budget is this book's proposed spending,
    # the row before it the current year's adopted spending.
    reserves = budget["fund_balance"]
    spending = budget["general_fund"]["total_expenditures"]
    last, before = reserves["years"][-1], reserves["years"][-2]
    if last["year"] != budget["meta"]["fiscal_year"] - 2:
        raise ValueError(f"fund balance ends in {last['year']}, not two years before {budget['meta']['fiscal_year']}")
    rec.check("fund balance: last row's budget vs proposed general fund spending",
              last["budget_expenses"], spending["budget"], reserves["page"])
    rec.check("fund balance: previous row's budget vs adopted general fund spending",
              before["budget_expenses"], spending["current_adopted"], reserves["page"])


def extract(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        texts = body_pages([page.extract_text() or "" for page in pdf.pages])
        staffing_page = find_page(texts, "PERSONNEL SUMMARY")
        staffing_words = pdf.pages[staffing_page].extract_words()
    rec = Reconciler()
    meta = parse_meta(texts)
    year = meta["fiscal_year"]
    units = parse_units(texts, year, rec)
    budget = {
        "meta": meta,
        "tax_rate": parse_tax_rate(texts),
        "valuation": parse_valuation(texts),
        "levy_limit": parse_levy_limit(texts),
        "levy_by_fund": parse_levy_by_fund(texts, rec),
        "general_fund": parse_general_fund(texts, units, rec),
        "all_funds": parse_all_funds(texts, year, rec),
        "units": units,
        "staffing": parse_staffing(staffing_words, staffing_page + 1, rec),
        "debt": parse_debt(texts, rec),
        "capital_projects": parse_capital_projects(texts, rec),
        "deferred_projects": parse_deferred_projects(texts, rec),
        "fund_balance": parse_fund_balance(texts, rec),
        "motor_pool": parse_motor_pool(texts),
    }
    check_arithmetic(budget, rec)
    cross_check(budget, rec)
    budget["source_discrepancies"] = rec.discrepancies
    return budget


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: python extract_budget.py <budget.pdf> <budget.json>")
    budget = extract(sys.argv[1])
    # newline="\n" keeps the file byte-identical whether it is written on Windows or in CI
    with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as f:
        json.dump(budget, f, indent=2)
        f.write("\n")
    print(f"{budget['meta']['stage']} {budget['meta']['fiscal_year']}: "
          f"{len(budget['units'])} budget units, "
          f"known source discrepancies: {len(budget['source_discrepancies'])} -> {sys.argv[2]}")


if __name__ == "__main__":
    main()
