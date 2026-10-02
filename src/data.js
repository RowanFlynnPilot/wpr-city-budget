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
