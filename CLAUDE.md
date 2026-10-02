# CLAUDE.md — wpr-city-budget

Context for Claude Code sessions on this repo.

## What this is

A reader-facing tool for **Wausau Pilot & Review** on the **City of Wausau's 2027 proposed budget**: what the city's share of a property tax bill is, where the levy goes, and what each department asked for and got. Requested by Shereen on Oct. 2, 2026. The Finance Committee takes up the budget and the 2027 fee schedule on Tuesday, Oct. 6, 2026, at 6:30 p.m.

Sibling of `wpr-budget` ("Follow the Money", Marathon County). Kept as its own repo because the city and county budget books have different shapes; it reuses the same visual language.

## Status (Oct. 2, 2026)

- **Done:** `extract_budget.py` and a validated `public/budget.json`, built from the mayor's proposed budget as published in the 284-page Finance Committee packet.
- **Not built:** the React/Vite frontend, the Pages deploy workflow, the WordPress embed.
- **Undecided:** whether v1 includes a fee-change list and a ten-year spending history (see "Ideas not built").

## Stack and pattern

`python extract_budget.py <pdf> public/budget.json` → React/Vite reads `budget.json` → GitHub Pages via Actions → WordPress iframe.

- This is a **manual ingest**, not a scheduled scraper. The budget changes a few times a year at most.
- When the frontend is added, `base` in `vite.config.js` must be `/wpr-city-budget/` to match the repo name.
- Design system: teal `#3A867C`, cream `#F6F2E9`, Fraunces for display, Public Sans for body, JetBrains Mono for figures.
- Dev environment: Windows, PowerShell 5.1. Chain commands with `;`, not `&&`. Use `python -m pip`.

## Engineering rules

One correct path, no fallbacks. Fail fast and loud. Small single-purpose functions. Surgical changes. No overengineering.

## The extractor

- Reads the PDF's text layer with pdfplumber and parses lines. The tables have no ruling lines, so `extract_tables()` is not used.
- **Only pages carrying the book's running header are parsed.** The packet wraps the book in an agenda sheet, a cover, and trailing layout leftovers (PDF pages 275–284) that repeat some tables.
- Headings are set in small caps, which the text layer returns in scrambled case (`BUdGeT sUMMArY`). All matching is case-insensitive, and display names come from the `UNIT_NAMES` map.
- The stage (`proposed`) and fiscal year come from the running header. No years are hard-coded.
- **Every table is reconciled**: rows against printed totals, tables against each other (the 41 budget pages sum exactly to the all-funds totals; each levy row equals the taxes its fund's budget counts on), and tables without totals against their own arithmetic. A mismatch raises and names the table and page.
- `KNOWN_DISCREPANCIES` lists mismatches that are in the source PDF itself. Each is carried into `source_discrepancies` in the JSON. Add to it only after checking the page by eye.
- The source PDF is gitignored. Keep it in the repo folder as `2027-proposed-budget.pdf`.
- Whether the city reissues the full book after committee or council changes is not known. If it does, rerun on the new PDF. If the final column is renamed from "Proposed", unit-page detection will fail loudly and need a deliberate update.

## budget.json contract

Dollar amounts are whole-dollar integers. Every `page` is the page's **position in the PDF**. The number printed in the page corner is `page - meta.printed_page_offset` (offset is 1 in the packet).

| Key | Contents |
| --- | --- |
| `meta` | `stage`, `fiscal_year`, `years` (`prior` 2025, `current` 2026, `budget` 2027), `printed_page_offset` |
| `tax_rate` | Total levy, assessed value, rate per $1,000 for the budget year and current year, and `assessed_valuation_is_estimate` |
| `valuation` | Equalized and assessed value by year, 2017–2027 |
| `levy_limit` | State levy-limit history: allowable levy, actual levy, debt-service exception |
| `levy_by_fund` | Levy by fund, 2018–2027. `funds[].unit` names the matching entry in `units` (`null` for the General Fund as a whole). Also `subtotal`, `tax_increment`, `total` |
| `general_fund` | Revenues by source and the statement's totals. Spending by department is **not** here; use `units` where `fund_group` is `General Fund` |
| `all_funds` | Revenues and expenditures by category, budget year vs. current year |
| `units` | The 41 department and fund budgets. Each has `fund_group`, `expenses[]`, `revenues[]`, `total_expenses`, `total_revenue` (`null` when the unit has no revenue table) |
| `staffing` | Full-time-equivalent positions by department, 2027 back to 2017. `null` means the cell is blank in the source |
| `debt` | `outstanding` (drawn balances, with as-of date), `go_schedule` (repayment by year), `limit` (legal debt limit) |
| `capital_projects` | Funded projects by category, and funding sources |
| `deferred_projects` | Capital requests left out of the budget, by department |
| `source_discrepancies` | Known mismatches in the source document |

Unit rows carry seven columns: `prior_actual`, `current_adopted`, `current_modified`, `current_estimated`, `requested`, `recommended`, `proposed`. In the proposed book, `recommended` and `proposed` are identical everywhere.

## What the frontend must get right

1. **The bill breakdown uses the full levy.** The rate ($9.2404 per $1,000) is the total levy ($40.63M) divided by assessed value. That total includes $3.39M for tax increment districts. Slices of a homeowner's bill must be shares of `levy_by_fund.total`, with tax increment as its own slice. Shares of `subtotal` will not add up to the bill.
2. **The rate is preliminary.** The 2027 assessed value is the city's placeholder (exactly last year plus 1.00%) until the state publishes final figures. Label it.
3. **City portion only.** The full tax bill also includes the county, school district and technical college, whose rates are set in mid-November.
4. **The calculator takes assessed value**, the figure on the tax bill, not market value.
5. **Do not headline the all-funds total.** The $158.4M includes transfers between city funds and internal service funds that bill other departments. Lead with the levy and the general fund.
6. **"Other General Government" is not an ordinary department.** It holds the general fund's general revenues (about $40M, including the property tax) and $150,000 for a proposed city administrator. Do not show it as a department that earns $40M.
7. **Request vs. budget is "changed from request", not "cut".** Some budgets came in above the request (the water utility by $3.15M).
8. **Debt has two audiences.** General obligation debt is taxpayer-backed: $75.9M drawn, $78.2M counted against the legal limit once undrawn state loans are included. Water and sewer revenue debt ($139.3M) is repaid by ratepayers.
9. **Staffing in 2017 is not comparable.** It is the only year that counts the 11 council members.
10. **General fund spending exceeds revenue by exactly $300,000.** This matches the vacancy allowance described in the overview, but the book does not say so. Unconfirmed.

## Planned v1 sections

1. "Your city tax bill" calculator
2. Where the levy goes, with the 2018–2027 history by fund
3. General fund: where it comes from, where it goes
4. Department drill-down: request, recommended, proposed
5. Debt
6. Capital projects, including the deferred list

## Source document quirks

Page numbers are PDF positions.

- **Capital project list (p. 22):** the itemized infrastructure projects total $16,502,360; the printed total is $18,332,360. The $1,830,000 gap equals the Ethel Street reconstruction, which appears only in a second copy of the list on p. 161. The two copies also differ on the taxiway project ($190,000 vs. $10,000), borrowing ($6,255,000 vs. $6,550,000) and total cost. The p. 22 totals match the fund's budget, so the extractor uses p. 22.
- **Housing Stock Improvement Fund:** $190,000 proposed with nothing requested; missing from the overview's fund tables though included in their totals.
- **Levy-limit table (p. 16):** gives the 2026 levy as $34,313,205; every other table says $34,226,703.
- **History charts:** the Other General Government chart shows about $1.25M for 2025 where its budget table says $131,072. The airport chart stops at 2024.
- **Central Capital Purchasing (p. 164):** the by-department table still shows 2026 figures.

## Ideas not built

- **Fee changes.** The fee schedule (pp. 252–273) has roughly 65–70 rates that change for 2027, nearly all increases. The text is too irregular to parse with the same guarantees; a hand-verified list is the safer route.
- **Ten-year history.** The budget-vs-actual charts (pp. 230–250) are vector drawings, so values can be measured from bar and line positions. In a test, 39 of 41 charts reproduced the known 2025 actual within 0.25% of the chart's scale. These would be close approximations, not exact figures, and belong in a separate file from `budget.json`.
