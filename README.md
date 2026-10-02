# wpr-city-budget

City of Wausau budget tool for [Wausau Pilot & Review](https://wausaupilotandreview.com): what the city's share of a property tax bill is, where the levy goes, and what each department asked for and got.

**Status:** data layer only. `extract_budget.py` turns the city's budget PDF into `public/budget.json`. The reader-facing page is not built yet.

## Run the extractor

The source PDF is not in the repo. Save the city's budget PDF in this folder, then:

```powershell
python -m pip install -r requirements.txt; python extract_budget.py 2027-proposed-budget.pdf public\budget.json
```

Expected output for the 2027 proposed budget:

```
proposed 2027: 41 budget units, known source discrepancies: 1 -> public\budget.json
```

Every table is checked against the totals printed in the document and against the other tables. If a number does not reconcile, the run stops and names the table and page.

See `CLAUDE.md` for the data contract and the rules the frontend has to follow.
