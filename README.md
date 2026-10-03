# wpr-city-budget

**Follow the Money: Wausau's 2027 budget.** A City of Wausau budget tool for [Wausau Pilot & Review](https://wausaupilotandreview.com): what the city's share of a property tax bill is, where the levy goes, and what each department asked for and got.

Live at <https://rowanflynnpilot.github.io/wpr-city-budget/>.

## Embed on WordPress

The page reports its content height to the parent page, so the iframe matches it exactly (no inner scrollbar):

```html
<iframe id="wpr-city-budget" src="https://rowanflynnpilot.github.io/wpr-city-budget/"
        style="width:100%;border:0" scrolling="no" allow="web-share; clipboard-write"
        title="Follow the Money: Wausau's city budget"></iframe>
<script>
addEventListener("message", (e) => {
  if (e.origin === "https://rowanflynnpilot.github.io" && e.data && e.data.type === "wpr-city-budget:height")
    document.getElementById("wpr-city-budget").style.height = e.data.height + "px";
});
</script>
```

The `allow` attribute lets the Share button open the phone's share sheet or copy the link from inside the embed; without it, readers get the link to copy by hand.

## Languages

The page reads in English, Spanish and Hmong; readers switch in the banner, and the choice is remembered. Link or embed a language directly with `?lang=es` or `?lang=hmn` (for example in the iframe `src` of a Spanish-language story). Spanish is a full translation; Hmong is a beta community translation and says so on the page, inviting corrections. Names the city publishes (departments, funds, budget categories, fees, projects) and the hand-written notes in the data files stay in English in every language, and the page says that too.

Every reader-facing sentence lives in `src/strings/en.jsx`, `es.jsx` and `hmn.jsx` under the same keys. Adding or changing text means changing all three: a key missing from any language stops the page at load, rather than showing English in the middle of a translation.

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
