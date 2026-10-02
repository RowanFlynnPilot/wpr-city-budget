# CLAUDE.md — wpr-city-budget

Context for Claude Code sessions on this repo.

## What this is

A reader-facing tool for **Wausau Pilot & Review** on the **City of Wausau's 2027 proposed budget**: what the city's share of a property tax bill is, where the levy goes, and what each department asked for and got. Requested by Shereen on Oct. 2, 2026. The Finance Committee takes up the budget and the 2027 fee schedule on Tuesday, Oct. 6, 2026, at 6:30 p.m.

Sibling of `wpr-budget` ("Follow the Money", Marathon County). Kept as its own repo because the city and county budget books have different shapes; it reuses the same visual language.

## Status (Oct. 2, 2026)

- **Done:** `extract_budget.py` and a validated `public/budget.json`, built from the mayor's proposed budget as published in the 284-page Finance Committee packet.
- **Done:** v1 frontend, all ten items of the build spec including staffing. Every acceptance value checked on the rendered page; no horizontal scroll at 360px with all 41 drill-downs open. Deploys to `https://rowanflynnpilot.github.io/wpr-city-budget/` on push to `main`.
- **Decisions made in the build:**
  - Masthead is the Follow the Money flag (seal + wordmark, tagline, dateline, thick-over-thin slate rule); the tool title sits in a `#2B655D` banner. `#3A867C` is used for fills only; on cream it is 3.85:1, so teal text uses `#2B655D`.
  - Chart palette (validated with the dataviz checker on `#F6F2E9`): teal general fund, `#2E5C9A` debt, `#C9922E` tax increment, `#77706A` all other funds. Every chart has a legend and a table of the same figures.
  - Changes are shown neutrally (glyph and sign, no red/green).
  - Rule 10: the page shows the $300,000 gap as "planned spending exceeds revenue" with no explanation, pending confirmation from the city.
  - The city link goes to its "Annual Financial and Budget Reports" page (supplied by Rowan), not to a specific PDF.
  - Cloudflare Web Analytics uses the shared rowanflynnpilot.github.io token, as in `wpr-budget`.
- **Next:** an OG card (`public/og-card.png`, generated per the wpr-brand skill); entries in `public/updates.json` as the committee and council amend the budget.

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

## v1 build spec

Working title: **Follow the Money: Wausau's 2027 budget** (Shereen's call). Every screen carries a status line: "Mayor's proposed budget. Not yet adopted."

Build in this order. If the session runs short, the top of the list ships.

1. **Scaffold.** React + Vite. If `..\wpr-budget` exists, read it first and mirror its conventions: `vite.config.js`, deploy workflow, iframe sizing, chart approach, file layout. Load `budget.json` at runtime from `import.meta.env.BASE_URL`; if the fetch fails or a top-level key is missing, show an error state and throw. No numbers hard-coded in components: every figure on screen comes from `budget.json`.
2. **Your city tax bill** (hero). Input: assessed value, default $200,000, labeled as an example. Output: the 2027 city tax, the 2026 city tax, and the difference, from `tax_rate.rate_per_1000`. Below it, the bill split into slices: each fund in `levy_by_fund.funds` plus tax increment, as a share of `levy_by_fund.total` for the budget year. Hide zero slices. Use the labels under "Reader-facing labels".
3. **Where the levy goes over time.** `levy_by_fund` 2018–2027: total levy by year with year-over-year change, and the split by fund.
4. **General fund.** Revenues from `general_fund.revenues`; spending from `units` where `fund_group` is `General Fund`, largest first. Handle Other General Government per rule 6.
5. **Department and fund drill-down.** All 41 `units`, grouped by `fund_group`, general fund first. Each shows current-year adopted, requested, and proposed totals, the change from request, and its expense and revenue categories. Include a "see the city's page" reference using `page`.
6. **Capital projects.** Funded list by category and funding sources from `capital_projects`; then the deferred list from `deferred_projects`. Show a note under the infrastructure list from `source_discrepancies`: the city's printed total is $1,830,000 more than the projects it lists.
7. **Debt.** `debt.outstanding` split into taxpayer-backed and ratepayer-backed, the legal limit from `debt.limit`, and the repayment schedule from `debt.go_schedule`.
8. **Staffing** (if time allows). `staffing` by department, with the 2017 caveat.
9. **Footer.** Source, method and caveats in plain language (rules 2, 3 and 5), plus "Corrections: editor@wausaupilotandreview.com". Link to the city's budget document only when Rowan supplies the URL; do not guess one.
10. **Updates log.** `public/updates.json`, an array of `{date, body, summary, url}` edited by hand as the committee and council amend the budget. Ship it empty; render the section only when it has entries. Last year the Finance Committee changed the budget by motion across several meetings, so expect amendments without a new PDF.

Layout: single column, mobile first, usable at 360px wide with no horizontal scroll, inside a WordPress iframe. Tables that cannot fit scroll inside their own container.

## Reader-facing labels

For the bill and levy slices. Keys are `levy_by_fund.funds[].name`.

| Source name | Label | One-line description |
| --- | --- | --- |
| General Fund | Day-to-day services | Police, fire, streets, parks and city hall |
| Debt Service Fund | Debt payments | Principal and interest on money the city has borrowed |
| (tax increment) | Tax increment districts | Taxes on new development in the city's TIF districts, set aside for those districts' costs |
| MetroRide Fund | Metro Ride | The city bus system |
| Recycling Fund | Recycling | Curbside recycling |
| Central Equipment Capital Fund | Equipment and small facility work | Police cameras, radios and vests; computers and phones; small building repairs |
| Community Development | Community development | Planning, economic development and housing programs |
| Capital Projects Fund | Streets and construction | The tax-funded share of street, sidewalk and building projects |
| Wausau Downtown Airport Fund | Downtown airport | Wausau Downtown Airport operations |
| Parking Fund | Parking | City ramps and lots |

## Acceptance values

Check the built page against these. All come from `budget.json`.

- Total levy: $40,628,845, up $2,573,037 (6.76%) from $38,055,808
- Rate per $1,000: $9.2404, up from $8.7418
- $200,000 home: $1,848.08 in 2027, $1,748.36 in 2026, difference $99.72
- Bill slices at $200,000 (rounded to cents they sum to the bill within a few cents): day-to-day services $1,195.03 (64.7%), debt payments $265.65 (14.4%), tax increment districts $154.18 (8.3%), Metro Ride $66.05 (3.6%), recycling $48.94, equipment $38.13, community development $31.13, streets and construction $22.65, airport $15.61, parking $10.69
- General fund: spending $49,616,051, revenue $49,316,051, property tax $26,272,041
- Police: proposed $14,784,741, requested $15,033,320, change from request -$248,579. Fire: $12,133,645. Public Works: $11,462,333
- 41 units; their proposed spending sums to $158,432,413
- Capital projects $19,283,371; deferred projects $9,095,154
- General obligation debt: $75,858,460 drawn, $78,201,125 counted against a $231,283,255 limit (33.81%); 2027 payment $14,378,025; all city debt $215,144,142
- Staffing: 355.20 positions in 2027, 354.20 in 2026

## Definition of done

1. `npm run build` passes and every acceptance value above appears correctly on the page.
2. No horizontal scroll at 360px.
3. `.github/workflows/deploy.yml` deploys to GitHub Pages on push to `main`; the page is live at `https://rowanflynnpilot.github.io/wpr-city-budget/`. Pages needs the repo to be public. Enable it once with `gh api repos/RowanFlynnPilot/wpr-city-budget/pages -X POST -f build_type=workflow`.
4. README has the WordPress iframe snippet.
5. This file's Status section is updated, and work is committed and pushed after each section.

Do not edit `budget.json` by hand and do not change `extract_budget.py` to make the frontend easier. If the data looks wrong, stop and say so.

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
