import EN from "./strings/en.jsx";

/*
 * Every reader-facing sentence is a key in src/strings/en.jsx. A value is a
 * string or a function of figures that arrive already formatted, so the
 * wording lives in one table rather than in the components.
 *
 * The page is English only. Spanish and Hmong versions were live Oct. 3-5,
 * 2026 and were taken down until fluent readers review them; reverting the
 * commit that removed them restores the language switch and both tables.
 */

// t(key, ...args): the entry, called with args when it is a function. A key
// the table lacks is a bug and stops the page.
function t(key, ...args) {
  const entry = EN[key];
  if (entry === undefined) throw new Error(`No string for "${key}" (src/strings/en.jsx)`);
  return typeof entry === "function" ? entry(...args) : entry;
}

export function useStrings() {
  return t;
}
