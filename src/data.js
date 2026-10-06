// Runtime data loading. One source of truth: budget.json, built by
// extract_budget.py. No inline numbers, no fallback; a missing file or key
// stops the page with an error.

const BUDGET_KEYS = [
  "meta", "tax_rate", "valuation", "levy_limit", "levy_by_fund", "general_fund",
  "all_funds", "units", "staffing", "debt", "capital_projects", "deferred_projects",
  "fund_balance", "motor_pool", "source_discrepancies",
];

async function fetchJson(file) {
  const r = await fetch(import.meta.env.BASE_URL + file, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
  return r.json();
}

function checkBudget(b) {
  const missing = BUDGET_KEYS.filter((k) => !(k in b));
  if (missing.length) throw new Error(`budget.json is missing ${missing.join(", ")}`);
  return b;
}

// Hand-verified fee changes (fees.json, checked against the PDF by check_fees.py).
// Its years must be the budget's, so a stale list can't sit beside a new book.
const FEE_KEYS = ["source", "years", "verification", "groups", "unclear", "source_discrepancies"];

function checkFees(f, meta) {
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

function checkHistory(h, b) {
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
function checkUpdates(u) {
  if (!Array.isArray(u)) throw new Error("updates.json must be an array");
  u.forEach((e, i) => {
    const missing = ["date", "body", "summary", "url"].filter((k) => !(k in e));
    if (missing.length) throw new Error(`updates.json entry ${i} is missing ${missing.join(", ")}`);
    // Hand-edited on deadline, so the formats are checked too.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || isNaN(new Date(e.date + "T12:00:00"))) {
      throw new Error(`updates.json entry ${i}: date must be YYYY-MM-DD, got "${e.date}"`);
    }
    if (e.url !== null && !String(e.url).startsWith("https://")) {
      throw new Error(`updates.json entry ${i}: url must be an https:// link or null, got "${e.url}"`);
    }
  });
  return u;
}

// All four files are fetched at once (none waits on another), then checked:
// fees and history against the budget they must belong to.
export async function loadAll() {
  const [b, fees, history, updates] = await Promise.all(
    ["budget.json", "fees.json", "history.json", "updates.json"].map(fetchJson));
  checkBudget(b);
  return { b, fees: checkFees(fees, b.meta), history: checkHistory(history, b), updates: checkUpdates(updates) };
}
