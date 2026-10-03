// Runtime data loading. One source of truth: budget.json, built by
// extract_budget.py. No inline numbers, no fallback; a missing file or key
// stops the page with an error.

const BUDGET_KEYS = [
  "meta", "tax_rate", "valuation", "levy_limit", "levy_by_fund", "general_fund",
  "all_funds", "units", "staffing", "debt", "capital_projects", "deferred_projects",
  "source_discrepancies",
];

async function fetchJson(file) {
  const r = await fetch(import.meta.env.BASE_URL + file, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
  return r.json();
}

export async function loadBudget() {
  const b = await fetchJson("budget.json");
  const missing = BUDGET_KEYS.filter((k) => !(k in b));
  if (missing.length) throw new Error(`budget.json is missing ${missing.join(", ")}`);
  return b;
}

// Hand-verified fee changes (fees.json, checked against the PDF by check_fees.py).
// Its years must be the budget's, so a stale list can't sit beside a new book.
const FEE_KEYS = ["source", "years", "verification", "groups", "unclear", "source_discrepancies"];

export async function loadFees(meta) {
  const f = await fetchJson("fees.json");
  const missing = FEE_KEYS.filter((k) => !(k in f));
  if (missing.length) throw new Error(`fees.json is missing ${missing.join(", ")}`);
  if (f.years.current !== meta.years.current || f.years.budget !== meta.years.budget) {
    throw new Error(`fees.json covers ${f.years.current}-${f.years.budget}; the budget is ${meta.years.current}-${meta.years.budget}`);
  }
  return f;
}

// Ten-year budget-to-actual history, measured from the book's charts by
// extract_history.py. Approximate figures, so a separate file from budget.json.
// It must come from the same book and cover every budget unit.
const HISTORY_KEYS = ["source", "method", "tolerance_pct_of_axis", "fiscal_year", "units"];

export async function loadHistory(b) {
  const h = await fetchJson("history.json");
  const missing = HISTORY_KEYS.filter((k) => !(k in h));
  if (missing.length) throw new Error(`history.json is missing ${missing.join(", ")}`);
  if (h.fiscal_year !== b.meta.fiscal_year) {
    throw new Error(`history.json is for ${h.fiscal_year}; the budget is for ${b.meta.fiscal_year}`);
  }
  const byUnit = new Map(h.units.map((u) => [u.unit, u]));
  const unmatched = b.units.filter((u) => !byUnit.has(u.name)).map((u) => u.name);
  if (unmatched.length) throw new Error(`history.json has no chart for ${unmatched.join(", ")}`);
  return { ...h, byUnit };
}

// Hand-edited log of committee and council amendments: [{date, body, summary, url}].
export async function loadUpdates() {
  const u = await fetchJson("updates.json");
  if (!Array.isArray(u)) throw new Error("updates.json must be an array");
  u.forEach((e, i) => {
    const missing = ["date", "body", "summary", "url"].filter((k) => !(k in e));
    if (missing.length) throw new Error(`updates.json entry ${i} is missing ${missing.join(", ")}`);
  });
  return u;
}
