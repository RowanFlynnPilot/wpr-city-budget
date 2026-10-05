# wpr-city-budget

**Follow the Money: Wausau's 2027 budget.** A City of Wausau budget tool for [Wausau Pilot & Review](https://wausaupilotandreview.com): what the city's share of a property tax bill is, where the levy goes, and what each department asked for and got.

Live at <https://rowanflynnpilot.github.io/wpr-city-budget/>.

## Embed on WordPress

wausaupilotandreview.com sits behind a Cloudflare firewall that rejects any post containing a `<script` tag, even `<script src>`. The editor reports it as "Updating failed. The response is not a valid JSON response." (found on `wpr-gas-prices`, Sept. 2026). So both snippets are bare iframes with no script. Paste one into a **Custom HTML** block. Saving needs an Editor or Administrator account: for Authors and Contributors, WordPress strips the iframe on save and leaves an empty box.

Both were checked on Oct. 5, 2026 in WordPress 7.1.2 (WordPress Playground, default theme): published through the block editor's Publish button (the save request returned JSON, with no notice and no invalid block), every attribute kept as pasted, the card fitting its frame at screen widths from 320 to 1280px, and the full tool scrolling inside its frame with its nav working.

### In a story: the calculator card

The title, status line and calculator, with a link that opens the full breakdown in a new tab. It fits its frame at every width, so readers scroll past it like an image.

```html
<div style="position:relative;padding-top:max(505px, calc(1155px - 143%), min(calc(781px - 28%), calc(1241px - 100%)));"><iframe src="https://rowanflynnpilot.github.io/wpr-city-budget/?view=card" title="Follow the Money: what Wausau's 2027 budget means for your tax bill" loading="lazy" allow="web-share; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe></div>
```

Without a script the frame cannot measure the card, so its height is a formula of the frame's own width: the wrapper's `padding-top` percentages are shares of the column it sits in, whatever the theme. The card's height steps down as the frame widens (text wraps less, and from 640px the calculator goes two-column), so the formula is the largest of three pieces: a floor, a steep line for the narrowest frames and, below 640px, a gentle line that drops sharply after it. It was fitted on Oct. 5, 2026 to the card's measured height at frame widths from 240 to 1100px and holds with at least 24px to spare for every frame 260px or wider (a 320px phone in WordPress's default theme; WPR's column there is 288px), with the input emptied, a $99,999,999 value or the Share fallback showing. The card centers its content, so spare height is even teal margin. **If the banner or calculator changes, re-measure** (the content height of `?view=card` at frame widths 260 to 1100) and refit the formula.

### On its own page: the full tool

```html
<iframe src="https://rowanflynnpilot.github.io/wpr-city-budget/" title="Follow the Money: Wausau's 2027 budget" allow="web-share; clipboard-write" style="display:block;width:100%;height:90vh;min-height:560px;border:0;"></iframe>
```

The full tool is about 19,000px tall on a desktop and more on a phone, so without a script it scrolls inside its frame, with its section nav pinned at the frame's top. Use it on a page of its own, or as the last thing in a story. Mid-story it fills a phone's screen, and readers have to scroll through the whole tool to get past it.

The `allow` attribute lets the Share button open the phone's share sheet or copy the link from inside the frame; without it, readers get the link to copy by hand.

The page still posts its content height to the parent (`{type: "wpr-city-budget:height", height}`). If an administrator ever installs a listener outside post content, where the firewall allows it (the `wpr-fish-fry` README has one), the full tool's frame can match its content instead of scrolling.

## Languages

The page is in English only. Spanish and Hmong versions, both AI-drafted (Hmong labeled a beta), were live Oct. 3–5, 2026, and were taken down until fluent readers review them. Reverting the commit "English only until the translations are reviewed" restores the language switch, the `?lang=` links and both string tables; after that, refit the card's height formula for the tallest language. A `?lang=` link from those days now opens the English page.

## Sharing and sponsors

- **Share link.** The Share button in the calculator sends `SHARE_URL` from `src/labels.js`, with a line about the example $200,000 home (never the reader's own value). It points at the tool for now. Once the story runs, set it to the story's URL so shared links land on WPR's site.
- **Sponsor credit.** `src/sponsors.json` holds a "Presented by" credit for the banner. While `enabled` is `false` nothing renders. To sell it, set `enabled` to `true` and fill `name` (plus `url` and `logo`); the link is marked `rel="sponsored"` and UTM-tagged. Sales contact: weber.chris@wausaupilotandreview.com.

## Run it locally

```powershell
npm install; npm run dev
```

Then open <http://localhost:5173/wpr-city-budget/>. `npm run build` writes the site to `dist/`. Pushing to `main` builds and deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Log a committee or council change

When the Finance Committee or the council amends the budget without a new PDF, add an entry to `public/updates.json` and push. The "Changes since the proposal" box appears at the top of the page once the file has an entry:

```json
[
  {
    "date": "2026-10-06",
    "body": "Finance Committee",
    "summary": "One or two plain sentences on what changed.",
    "url": "https://wausaupilotandreview.com/..."
  }
]
```

`date` is `YYYY-MM-DD`. Use `"url": null` until there is a story to link; the page leaves the link off. A malformed entry stops the page with a message naming it, so check the page after pushing.

## Rebuild the data

The source PDF is not in the repo. Save the city's budget PDF in this folder, then:

```powershell
python -m pip install -r requirements.txt; python extract_budget.py 2027-proposed-budget.pdf public\budget.json
```

Expected output for the 2027 proposed budget:

```
proposed 2027: 41 budget units, known source discrepancies: 1 -> public\budget.json
```

Every table is checked against the totals printed in the document and against the other tables. If a number does not reconcile, the run stops and names the table and page. Every figure on the page comes from `public/budget.json`; nothing is typed into the components.

The ten-year history comes from the book's budget-to-actual charts, measured from the drawings and checked against `budget.json`:

```powershell
python extract_history.py 2027-proposed-budget.pdf public\budget.json public\history.json
```

The fee changes in `public/fees.json` are a hand-verified list, not extractor output. After editing it, or with a new PDF, check it against the book; the check fails if any entry doesn't match its printed row or if any changed fee is missing:

```powershell
python check_fees.py 2027-proposed-budget.pdf public\fees.json
```

Then regenerate the social share card, which takes its year, stage and bar lengths from `budget.json`:

```powershell
python og_card.py
```

## Layout

```
public/budget.json        reconciled data the page reads (from extract_budget.py)
public/history.json       ten-year budget vs. actual, measured from the book's charts
public/fees.json          hand-verified list of fee changes
public/updates.json       hand-edited log of amendments
check_fees.py             checks fees.json against the PDF, row by row
extract_budget.py         PDF -> budget.json
extract_history.py        PDF charts -> history.json (approximate, checked against budget.json)
og_card.py                budget.json -> public/og-card.png (1200x630 share card)
src/App.jsx               loads the data, lays out the sections
src/sections/             one file per section, in page order
src/labels.js             lookups for reader-facing names, and the page's fixed links
src/i18n.jsx              languages: the switcher's state and t(key, ...args)
src/strings/              every reader-facing sentence: en.jsx, es.jsx, hmn.jsx
src/charts.jsx            the validated chart palette, legend, and lazy chart wrappers
src/plots.jsx             the recharts charts, loaded after the first render
src/ui.jsx, src/format.js shared pieces and number formatting
```

See `CLAUDE.md` for the data contract and the rules the page follows.
