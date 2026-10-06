// Number formatting. Dollar amounts in budget.json are whole dollars; the tax
// calculator works in cents.
const MINUS = "−";

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const usd = (n) => (n < 0 ? MINUS : "") + "$" + whole.format(Math.abs(n));
export const usdCents = (n) => (n < 0 ? MINUS : "") + "$" + cents.format(Math.abs(n));
export const signedUsd = (n) => (n > 0 ? "+" : "") + usd(n);
export const signedUsdCents = (n) => (n > 0 ? "+" : "") + usdCents(n);

export const pct = (n, digits = 1) => (n < 0 ? MINUS : "") + Math.abs(n).toFixed(digits) + "%";
export const signedPct = (n, digits = 1) => (n > 0 ? "+" : "") + pct(n, digits);

// Percent change; null when something starts from zero (there is no base).
export const change = (now, then) => (then ? ((now - then) / then) * 100 : now ? null : 0);

export const fte = (n) => n.toFixed(2);
// A column label: "$2.8M" from a million up, "$363K" below.
export const shortUsd = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`);

// A property's tax at a rate per $1,000 of assessed value, rounded to cents.
export const taxAt = (assessed, ratePer1000) => Math.round(assessed * ratePer1000 / 10) / 100;

// ---- Running text, AP style

// Dollars in millions: "$40.6 million".
export const millions = (n) => (n < 0 ? MINUS : "") + "$" + (Math.abs(n) / 1e6).toFixed(1) + " million";

// Counts: one through nine are spelled out, 10 and up are figures.
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
export const apCount = (n) => (n >= 0 && n < 10 ? WORDS[n] : String(n));

// Dates arrive as "September 25, 2026" (budget.json) or "2026-10-06"
// (updates.json); both become {y, m, d} so each language can write its own.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function parseLongDate(text) {
  const m = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(text);
  if (!m || !MONTHS.includes(m[1])) throw new Error(`Expected a date like "September 25, 2026", got "${text}"`);
  return { y: +m[3], m: MONTHS.indexOf(m[1]) + 1, d: +m[2] };
}
export function parseIsoDate(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) throw new Error(`Expected a date like "2026-10-06", got "${text}"`);
  return { y: +m[1], m: +m[2], d: +m[3] };
}

// AP style: {y: 2026, m: 9, d: 25} -> "Sept. 25, 2026". March through July are not abbreviated.
const AP_MONTHS = { January: "Jan.", February: "Feb.", August: "Aug.", September: "Sept.", October: "Oct.", November: "Nov.", December: "Dec." };
export function apDate({ y, m, d }) {
  const name = MONTHS[m - 1];
  return `${AP_MONTHS[name] || name} ${d}, ${y}`;
}

// Typographer's quotes for hand-typed text from the data files (notes, updates).
export const curly = (s) => s
  .replace(/(^|[\s(\[])"/g, "$1“").replace(/"/g, "”")
  .replace(/(^|[\s(\[])'/g, "$1‘").replace(/'/g, "’");

