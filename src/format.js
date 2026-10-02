// Number formatting. Dollar amounts in budget.json are whole dollars; the tax
// calculator works in cents.
const MINUS = "−";

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const usd = (n) => (n < 0 ? MINUS : "") + "$" + whole.format(Math.abs(n));
export const usdCents = (n) => (n < 0 ? MINUS : "") + "$" + cents.format(Math.abs(n));
export const signedUsd = (n) => (n > 0 ? "+" : "") + usd(n);
export const signedUsdCents = (n) => (n > 0 ? "+" : "") + usdCents(n);

export const compact = (n) => {
  const a = Math.abs(n);
  const s = a >= 1e6 ? "$" + (a / 1e6).toFixed(1) + "M"
    : a >= 1e3 ? "$" + Math.round(a / 1e3) + "K" : "$" + a;
  return (n < 0 ? MINUS : "") + s;
};

export const pct = (n, digits = 1) => (n < 0 ? MINUS : "") + Math.abs(n).toFixed(digits) + "%";
export const signedPct = (n, digits = 1) => (n > 0 ? "+" : "") + pct(n, digits);

// Percent change; null when something starts from zero (there is no base).
export const change = (now, then) => (then ? ((now - then) / then) * 100 : now ? null : 0);

export const fte = (n) => n.toFixed(2);

// A property's tax at a rate per $1,000 of assessed value, rounded to cents.
export const taxAt = (assessed, ratePer1000) => Math.round(assessed * ratePer1000 / 10) / 100;
