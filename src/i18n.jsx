import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import EN from "./strings/en.jsx";

/*
 * The page in three languages, as in wpr-budget. Spanish is a full
 * translation; Hmong (Hmoob Dawb, RPA) is AI-drafted and ships as a beta with a
 * note inviting corrections. Names the city publishes (departments, funds,
 * budget categories, fees, projects) and the hand-written notes in the data
 * files stay in English, as printed; a note says so in the other languages.
 *
 * Strings live in src/strings/<code>.jsx under the same keys. A value is a
 * string or a function of figures that arrive already formatted, so a
 * translation only arranges words. English ships with the page; Spanish and
 * Hmong load when a reader picks them, so English readers download only English.
 */
export const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "hmn", label: "Hmoob" },
];
const LOADERS = { es: () => import("./strings/es.jsx"), hmn: () => import("./strings/hmn.jsx") };
const TABLES = { en: EN };

// Every language carries every key: a gap stops the page when the table loads
// rather than put English in the middle of a Spanish or Hmong sentence.
async function loadTable(code) {
  if (!TABLES[code]) {
    const table = (await LOADERS[code]()).default;
    const missing = Object.keys(EN).filter((k) => !(k in table));
    const unknown = Object.keys(table).filter((k) => !(k in EN));
    if (missing.length || unknown.length) {
      throw new Error(`src/strings/${code}.jsx: missing [${missing.join(", ")}], unknown [${unknown.join(", ")}]`);
    }
    TABLES[code] = table;
  }
}

const STORAGE_KEY = "wpr-city-budget-lang";
const isLang = (code) => LANGS.some((l) => l.code === code);

// ?lang=es in the address (a link or an embed's src) wins, then the reader's
// last choice, then English. Storage can be blocked in an embed; the choice
// then lasts only for the visit.
function initialLang() {
  const asked = new URLSearchParams(location.search).get("lang");
  if (asked !== null) {
    if (!isLang(asked)) throw new Error(`?lang=${asked}: no such language (${LANGS.map((l) => l.code).join(", ")})`);
    return asked;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isLang(saved)) return saved;
  } catch { /* storage blocked */ }
  return "en";
}

const LangContext = createContext(null);

// Renders nothing until the language's table is in; a table that fails to
// load or check stops the page.
export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  const [failure, setFailure] = useState(null);
  const [, setLoaded] = useState(0);
  if (failure) throw failure;
  useEffect(() => {
    if (!TABLES[lang]) loadTable(lang).then(() => setLoaded((n) => n + 1), setFailure);
  }, [lang]);
  useEffect(() => {
    if (!TABLES[lang]) return;
    document.documentElement.lang = lang;
    document.title = TABLES[lang]["doc.title"];
  }, [lang, TABLES[lang]]);
  const setLang = (code) => loadTable(code).then(() => {
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* storage blocked */ }
    const url = new URL(location.href);
    if (code === "en") url.searchParams.delete("lang"); else url.searchParams.set("lang", code);
    history.replaceState(null, "", url);
  }, setFailure);
  if (!TABLES[lang]) return null;
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

// t(key, ...args): the active language's entry, called with args when it is a
// function. A key no table has is a bug and stops the page.
export function useStrings() {
  const { lang } = useContext(LangContext);
  return useMemo(() => (key, ...args) => {
    const entry = TABLES[lang][key];
    if (entry === undefined) throw new Error(`No string for "${key}" (src/strings/en.jsx)`);
    return typeof entry === "function" ? entry(...args) : entry;
  }, [lang]);
}
