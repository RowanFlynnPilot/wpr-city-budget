// Lookups for reader-facing words, and the page's fixed links. The words
// themselves live in src/strings/<lang>.jsx; every figure comes from the data.

// Bill and levy slices, keyed by levy_by_fund.funds[].name (CLAUDE.md,
// "Reader-facing labels"). A fund with no strings stops the page.
export function fundLabel(name, t) {
  return { label: t(`fund.${name}.label`), desc: t(`fund.${name}.desc`), short: t(`fund.${name}.short`) };
}

export const tifLabel = (t) => ({ label: t("fund.tif.label"), desc: t("fund.tif.desc"), short: t("fund.tif.short") });

// Short names for general fund departments where space is tight (the money
// flow). Department names are the city's and stay in English in every
// language. Keyed by units[].name; a general fund unit missing here stops the page.
const DEPARTMENT_SHORT = {
  "Police": "Police",
  "Fire": "Fire",
  "Public Works": "Public works",
  "Parks, Recreation and Forestry": "Parks",
  "City County Information Technology Commission": "IT",
  "Refuse Collection": "Garbage",
  "Customer Service": "Customer service",
  "Assessment": "Assessor",
  "Human Resources": "HR",
  "City Attorney": "Attorney",
  "Other General Government": "Other",
  "Mayor's Office": "Mayor",
  "Municipal Court": "Court",
  "Common Council": "Council",
};

export function departmentShort(name) {
  const s = DEPARTMENT_SHORT[name];
  if (!s) throw new Error(`No short name for general fund department "${name}" (src/labels.js)`);
  return s;
}

// Other General Government is not an ordinary department (rule 6): its budget
// page carries the general fund's general revenues, which pay for every
// department. The note's figure is the proposed city administrator, the
// Personal Services line of this unit (its only personnel).
export const OTHER_GENERAL_GOVERNMENT = "Other General Government";

export function administratorCost(unit) {
  const personnel = unit.expenses.find((e) => e.category === "Personal Services");
  if (!personnel) throw new Error(`${unit.name} has no Personal Services row`);
  return personnel.proposed;
}

// The status line every section carries, from meta.stage. A stage with no
// string stops the page, so a new book gets a deliberate update.
export const statusLine = (meta, t) => t(`status.${meta.stage}`);

// The number printed in the page corner of the city's book.
export const printedPage = (page, meta) => page - meta.printed_page_offset;

export const CITY_BUDGET_PAGE = "https://www.wausauwi.gov/your-government/finance/annual-financial-reports";
export const CORRECTIONS_EMAIL = "editor@wausaupilotandreview.com";
export const WPR_URL = "https://wausaupilotandreview.com/";
export const WPR_PHONE = "715-301-5539";
export const SUPPORT_URL = "https://wausaupilotandreview.com/support-our-publication/";
export const MEETING_TRACKER_URL = "https://rowanflynnpilot.github.io/marathon-meetings/";

// What the Share button sends: the tool itself until the story runs. Then set
// it to the story's URL, so shared links land on WPR's site with the embed.
export const SHARE_URL = "https://rowanflynnpilot.github.io/wpr-city-budget/";
