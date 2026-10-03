# wpr-city-budget

**Follow the Money: Wausau's 2027 budget.** A City of Wausau budget tool for [Wausau Pilot & Review](https://wausaupilotandreview.com): what the city's share of a property tax bill is, where the levy goes, and what each department asked for and got.

Live at <https://rowanflynnpilot.github.io/wpr-city-budget/>.

## Embed on WordPress

The page reports its content height to the parent page, so the iframe matches it exactly (no inner scrollbar):

```html
<iframe id="wpr-city-budget" src="https://rowanflynnpilot.github.io/wpr-city-budget/"
        style="width:100%;border:0" scrolling="no" title="Follow the Money: Wausau's city budget"></iframe>
<script>
addEventListener("message", (e) => {
  if (e.origin === "https://rowanflynnpilot.github.io" && e.data && e.data.type === "wpr-city-budget:height")
    document.getElementById("wpr-city-budget").style.height = e.data.height + "px";
});
</script>
```

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
src/labels.js             reader-facing names and notes (text only, no figures)
src/charts.jsx            recharts columns and the validated chart palette
src/ui.jsx, src/format.js shared pieces and number formatting
```

See `CLAUDE.md` for the data contract and the rules the page follows.
