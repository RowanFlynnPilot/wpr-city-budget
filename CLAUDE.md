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
- **Done:** social share card. `og_card.py` draws `public/og-card.png` (1200x630) from `budget.json`: year, entity and stage, plus a receipt whose bars are the budget-year levy split to scale. Its status wording mirrors `src/labels.js`; an unknown stage stops the run. Rerun it whenever `budget.json` changes.
- **Done:** the hand-verified fee changes list (`public/fees.json`, checked by `check_fees.py`), shown in a "Fees" section after the department drill-down. See "fees.json" below.
- **Done:** ten-year history. `extract_history.py` measures the 41 budget-to-actual charts (pp. 230–250) into `public/history.json`; each department's drill-down shows its chart (budget bars, actual line, dashed 2027 proposal from `budget.json`) with a table and an "approximate" note. See "history.json" below.
- **Done:** visual pass. The calculator sits in the teal banner as a paper card (the first thing a reader can do); the bill section opens with "Follow your $X", a money-flow diagram (`src/MoneyFlow.jsx`) that pours the reader's city tax into the funds (shares of the full levy, rule 1) and fans day-to-day services out into general fund departments. The department split is each department's share of general fund spending, and the page says the city does not assign tax dollars to departments. The flow's reveal is the page's one entrance animation. Every flow block worth 2.5% or more of its row is labeled: inside the bar when the measured text fits (names may wrap to two lines), otherwise as a callout under the row, stacked in lanes with leaders that never cross. On phones both rows step down four lanes deep; at 320px the Metro Ride and Recycling callouts are the ones that do not fit. Section eyebrows are gone and labels are sentence case; only the WPR tagline, dateline and banner kicker stay uppercase (brand). The nav marks the section in view, and each department row carries a bar scaled to the largest of the 41 budgets.
- **Done:** refinement pass. The drill-down lists each group's budgets largest first. On phones, rows in a list share fixed columns so their bars line up, the section nav scrolls the current section's link into view, and the general fund toggle reads "Spending" / "Revenue". The debt section gives the share of principal due in the first five years. The paragraph reset is `:where(.ftm p)` (zero specificity), so a class's own margin applies without `!important`.
- **Done:** second refinement pass. On phones a department's spending and revenue tables stack (category name, then its three figures), so the 2027 columns never hide behind a sideways scroll; the table markup carries explicit ARIA roles because the grid display would drop table semantics. Scroll-edge shading uses `--surface`, set to paper inside drill-downs. Fee rows for the same place in a row (monthly and annual permits) show the name once. The calculator reads whole dollars (cents after a decimal point are dropped) and may sit empty while the reader retypes; the page keeps the last value above zero.
- **Done:** third refinement pass. Embed: the height reporter measures `#root`, not the document (inside the iframe the document is never shorter than the frame, so it could grow but never shrink), and `.ftm` no longer has `min-height: 100vh`; nav links call `scrollIntoView`, which moves the host page (a hash link cannot scroll a frame that never scrolls). Loading: all four JSON files are fetched at once (`loadAll` in `src/data.js`), and recharts loads after the first render (`src/plots.jsx` behind the wrappers in `src/charts.jsx`, which hold each chart's height). On an emulated slow-4G phone the banner appears at about 1.8 s instead of 2.6 s. `updates.json` entries must have a `YYYY-MM-DD` date and an `https://` url or `null`. Print keeps section heads with their content and scales the flow to the page. Flow callouts have a tap target.
- **Done:** fourth refinement pass. axe-core reports no violations: WPR's flag is the page `<header>` and the tool (banner, nav, sections) sits in `<main>`; the fee arrows read as "to" (hidden arrow plus screen-reader text). Running text follows AP style through `src/format.js`: `millions()` ("$75.9 million"), `apCount()` (one through nine spelled out), `apDate()` ("Sept. 25, 2026"), and `curly()` for typographer's quotes in hand-typed text (fee notes, history notes, updates). The error state tells readers to reload and where to write, with the technical message below.
- **Done:** reader and funder pass. A "What's in the proposal" strip under the nav carries four computed findings (levy growth and the last year it was larger, budgets below and above request, the city administrator line, fee changes), each a jump link. The calculator ends with "See where your $X goes" and a Share button (`SHARE_URL` in `src/labels.js`; the share line uses the example home, never the reader's value). A closing teal band credits WPR's work, links WPR's support page and the Meeting Tracker. `src/sponsors.json` holds a hidden "Presented by" credit for the banner (as in `wpr-budget`); it renders only when enabled. In-page links share `jumpTo` in `src/ui.jsx`. The README iframe snippet now carries `allow="web-share; clipboard-write"`.
- **Done:** Spanish and Hmong, following `wpr-budget`: every reader-facing sentence is a key in `src/strings/en.jsx`, `es.jsx`, `hmn.jsx` (`t(key, ...args)` from `src/i18n.jsx`; figures arrive formatted, so a translation only arranges words). A key missing from any language stops the page at load. Spanish is a full translation; Hmong is an AI-drafted beta with a note inviting corrections. Names the city publishes (departments, funds' official names, budget categories, fees, projects) and the hand-written notes in the data files stay in English, marked `lang="en"`, and a note says so. The language comes from `?lang=`, then the reader's last choice, then English. Adding text means adding it in all three tables. The tab title is `doc.title`; a note under the updates log says its entries are in English. The section nav centers its links with auto margins (not `justify-content: center`), so when the labels overflow, as Spanish and Hmong do below about 900px, the strip starts at its left edge and every link stays reachable.
- **Done:** visual pass (Oct. 3). The levy table's highlighted 2027 row no longer indents its year: tables with a highlighted row carry `tbl-inset`, which insets every row's outer columns. The findings strip gives the levy increase to two decimals, as the banner and levy section do. A fee group whose changes are all increases says "29 increases" rather than "29 changes". Fee change arrows are spaced and centered like the rest of the page, and the search box's clear button is ink, not Chrome's blue.
- **Done:** widths and keyboard pass (Oct. 3). Checked every width from 320 to 1100px for text that spills out of its own box, not just the page. The calculator total, the findings figures and a department's three headline amounts are sized to their container (`cqi`), so they shrink before they overflow; the findings run four across only from 860px (at 640–860, the likely WordPress column, "$150,000" ran out of its card). Focus rings are white on the teal banner and band and teal inside the calculator card (the white overrides had been losing to the general rule). A table's scroll container is a focusable, labeled region only while the table is wider than it (`TableScroll` measures), so tables that fit add no tab stop or landmark. At 320px the levy and repayment tables scroll inside their containers, as the spec allows.
- **Done:** behavior pass (Oct. 3). Deep links (`…/#fees`) land under the nav and stay there: web fonts and the flow diagram (drawn once fonts are in) change the page's height after the first jump, and the browser's scroll anchoring did not correct it (the levy section ended up 450px down), so `App.jsx` re-scrolls to the section whenever `#root` resizes until the reader scrolls, taps or presses a key. Print hides the language buttons and the fee groups' arrows, keeps the findings strip, the rate note and each chart (with its heading, note and legend) on one page, and prints on white to the last page. "See where your $X goes" has a 34px tap target without moving anything.
- **Done:** script-free WordPress embeds (Oct. 3). WPR's Cloudflare firewall rejects any post containing `<script` (the editor's "not a valid JSON response"), so the README's snippets are bare iframes. `?view=card` renders the banner alone (title, status, calculator; no flag, kicker, dek or language notes, and a smaller title) for a story, with "See the full budget breakdown" opening the full page in a new tab; it fills its frame and centers its content. Its height comes from a wrapper, `padding-top: max(580px, calc(962px - 49%))`, so it follows the frame's own width on any theme; it was fitted to the card's measured height in all three languages at frames 240–1100px (24px to spare from 260px up): re-measure and refit if the banner or calculator changes. Both snippets were published and checked in WordPress 7.1.2 (Playground); Authors and Contributors cannot save iframes. The full page goes in a 90vh frame on a page of its own and scrolls inside it. An unknown `?view=` stops the page.
- **Done:** pre-meeting pass (Oct. 5). The card was stress-tested inside snippet-sized frames (empty input, $2.5M and the maximum value, the Share fallback; three languages; frames 260–720px): when a browser allows neither the share sheet nor copying, the link to copy now takes the Share button's place at the same 32px height instead of wrapping below it, which had pushed the card past its frame by up to 44px. The section nav clears its highlight and scrolls back to its first link when the reader returns above the first section (it had kept marking the last section passed).
- **Next:** entries in `public/updates.json` as the committee and council amend the budget. If the committee amends a fee, log it in `updates.json` only: `fees.json` mirrors the book, and `check_fees.py` holds it to the PDF. Update `fees.json` when the city publishes a new schedule.

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
- **History charts:** the Other General Government chart shows about $1.25M for 2025 where its budget table says $131,072. The airport chart stops at 2024. The Refuse Collection chart's axis starts at $800,000, not zero (the page's redraw starts at zero). Years with no budget bar (Housing Stock 2023–25, TID 11, TID 12's early years) are `null` in `history.json`.
- **Central Capital Purchasing (p. 164):** the by-department table still shows 2026 figures.
- **Fee schedules (pp. 252–273):** the comprehensive schedule (pp. 252–262) prints **2027 before 2026**; the building, electrical and plumbing schedules (pp. 263–273) print **2026 before 2027**. Page 262 repeats the tree, memorial, 400 Block and sound-system fees from p. 261 with 2026 prices in both columns. The Sylvan Hill Chalet non-commercial rate is printed as $1,406 for 2026 (p. 260), above the $599 commercial rate. Business, advertising and temporary sign fees (p. 267) have a 2026 rate and a blank 2027 cell. The PDF draws no rule between three pairs of rows on pp. 255 and 262 (see `EXTRA_CUTS` in `check_fees.py`).

## fees.json: the hand-verified fee changes

`public/fees.json` is written by hand, not by the extractor. It lists every fee whose 2027 rate differs from 2026, grouped for readers: `groups[].changes[]` each carry `fee` and `detail` (reader-facing), `kind` (`rate`, `removed`, `restructured`), `current` and `budget` (numbers, `null` when not a dollar rate), `label` and `section` (the printed label and heading, used by the check), `current_text` and `budget_text` (the cells exactly as printed), `page` (PDF position) and `note`. `unclear` holds rows the schedule leaves ambiguous; `source_discrepancies` holds problems in the schedule itself. `years` must match `budget.json`, or the page stops.

After any edit to `fees.json`, or a new PDF, run:

```powershell
python check_fees.py 2027-proposed-budget.pdf public\fees.json
```

It rebuilds every table row from the PDF's ruling lines and fails unless each entry matches its printed row (label, section, both cells and amounts) **and** every row that changes is listed, in `unclear`, or in `IGNORED` with a reason. Verified Oct. 2, 2026: 96 changes (91 up, 2 down, 1 dropped, 2 restructured) and 3 unclear.

## history.json: the measured ten-year history

The book gives past years only as charts (pp. 230–250): modified budget as bars, actual spending as a line, 2016–2025. They are vector drawings, so `extract_history.py` reads them directly:

```powershell
python extract_history.py 2027-proposed-budget.pdf public\budget.json public\history.json
```

Each chart is calibrated from its own tick labels and gridlines (a non-linear axis raises), and every bar top and line point is converted to dollars and rounded to 0.1% of the axis (`precision`). Titles map to units through `CHART_UNITS`; an unknown title or a unit without a chart raises. Every chart's last actual point is checked against the unit's `prior_actual` in `budget.json`: it must be within 0.25% of the axis, or the unit must be in `KNOWN_MISMATCHES` (Other General Government) or `KNOWN_SHORT` (the airport). Oct. 2, 2026 run: 41 charts, 39 checked, worst error 0.100% of the axis.

`units[]` each carry `unit`, `title`, `page`, `axis_max`, `precision`, `years`, `budget` (`null` where no bar is drawn), `actual`, `check` (`year`, `table`, `measured`, `error_pct_of_axis`, or `null`) and `note`. These are measurements of drawings, not table figures: never mix them into `budget.json`, and label them approximate wherever they appear. `fiscal_year` must match `budget.json`, and every unit needs a chart, or the page stops. Rerun with each new book.

## Ideas not built

- Nothing outstanding from the original list.
