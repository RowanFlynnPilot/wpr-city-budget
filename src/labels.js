// Reader-facing words. Text only: every figure on the page comes from budget.json.

// Bill and levy slices, keyed by levy_by_fund.funds[].name (CLAUDE.md,
// "Reader-facing labels"). A fund missing here stops the page.
const FUND_LABELS = {
  "General Fund": ["Day-to-day services", "Police, fire, streets, parks and city hall"],
  "Debt Service Fund": ["Debt payments", "Principal and interest on money the city has borrowed"],
  "MetroRide Fund": ["Metro Ride", "The city bus system"],
  "Recycling Fund": ["Recycling", "Curbside recycling"],
  "Central Equipment Capital Fund": ["Equipment and small facility work", "Police cameras, radios and vests; computers and phones; small building repairs"],
  "Community Development": ["Community development", "Planning, economic development and housing programs"],
  "Capital Projects Fund": ["Streets and construction", "The tax-funded share of street, sidewalk and building projects"],
  "Wausau Downtown Airport Fund": ["Downtown airport", "Wausau Downtown Airport operations"],
  "Parking Fund": ["Parking", "City ramps and lots"],
  "Animal Control": ["Animal control", "Animal control services"],
};

export const TIF = {
  label: "Tax increment districts",
  desc: "Taxes on new development in the city’s TIF districts, set aside for those districts’ costs",
};

export function fundLabel(name) {
  const l = FUND_LABELS[name];
  if (!l) throw new Error(`No reader-facing label for levy fund "${name}" (src/labels.js)`);
  return { label: l[0], desc: l[1] };
}

// One-line explanations of the fund groups in the department drill-down.
const GROUP_NOTES = {
  "General Fund": "The city’s main operating budget: police, fire, public works, parks and city hall. Most of the property tax lands here.",
  "Special Revenue Funds": "Money set aside for a specific purpose, such as recycling, room tax or community development grants.",
  "Debt Service Fund": "Payments on the city’s general obligation borrowing, which property taxes back.",
  "Capital Projects Funds": "Construction and equipment, plus the tax increment districts’ spending on development.",
  "Internal Service Funds": "Accounts that bill other city departments for vehicles, insurance and employee benefits. The same dollars also show up in the departments they bill.",
  "Enterprise Funds": "Services paid for largely by the people who use them: water, sewer, buses, parking and the airport.",
};

export function groupNote(group) {
  const n = GROUP_NOTES[group];
  if (!n) throw new Error(`No description for fund group "${group}" (src/labels.js)`);
  return n;
}

// Other General Government is not an ordinary department (rule 6): its budget
// page carries the general fund's general revenues, which pay for every
// department. The dollar figure in the note comes from the unit's own table.
export const OTHER_GENERAL_GOVERNMENT = "Other General Government";

export function otherGeneralGovernmentNote(unit, usd) {
  const personnel = unit.expenses.find((e) => e.category === "Personal Services");
  if (!personnel) throw new Error(`${unit.name} has no Personal Services row`);
  return `Citywide costs not assigned to a department, including ${usd(personnel.proposed)} `
    + "for a proposed city administrator. Its budget page also carries the general fund’s "
    + "general revenues, including the property tax, which pay for every department. "
    + "That money is not earned by this office.";
}

// Editorial context for a known source discrepancy, keyed by its `check`.
export const DISCREPANCY_CONTEXT = {
  "capital projects: Infrastructure":
    "The gap equals the cost of the Ethel Street reconstruction, which appears only in a second copy of this list later in the book.",
};

// The status line every section carries. Driven by meta.stage; a stage this
// page has not been written for stops it, so a new book gets a deliberate update.
const STATUS = {
  proposed: "Mayor’s proposed budget. Not yet adopted.",
};

export function statusLine(meta) {
  const s = STATUS[meta.stage];
  if (!s) throw new Error(`No status line for budget stage "${meta.stage}" (src/labels.js)`);
  return s;
}

// The number printed in the page corner of the city's book.
export const printedPage = (page, meta) => page - meta.printed_page_offset;

export const CITY_BUDGET_PAGE = "https://www.wausauwi.gov/your-government/finance/annual-financial-reports";
export const CORRECTIONS_EMAIL = "editor@wausaupilotandreview.com";
export const WPR_URL = "https://wausaupilotandreview.com/";
export const WPR_PHONE = "715-301-5539";
