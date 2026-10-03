import React, { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHead } from "../ui";
import { printedPage } from "../labels";
import { usd, usdCents, pct, signedPct, curly } from "../format";
import { useStrings } from "../i18n.jsx";

// Fee names, details and notes are WPR's English renderings of the city's
// schedule (fees.json); they stay in English in every language, marked lang="en".

// Whole dollars print without cents; $10.50 and $6.25 keep them.
const money = (n) => (Number.isInteger(n) ? usd(n) : usdCents(n));
const signedMoney = (n) => (n > 0 ? "+" : "") + money(n);

const direction = (c) => (c.kind !== "rate" ? c.kind : c.budget > c.current ? "up" : "down");

// The arrow is read aloud as "to".
function To() {
  const t = useStrings();
  return <><span aria-hidden="true"> → </span><span className="sr-only"> {t("fees.to")} </span></>;
}

function Rates({ c }) {
  const t = useStrings();
  if (c.kind === "rate") {
    return <span className="fee-rates"><span>{money(c.current)}</span><To /><span>{money(c.budget)}</span></span>;
  }
  if (c.kind === "removed") {
    return <span className="fee-rates"><span>{c.current_text}</span><To /><span>{t("fees.none")}</span></span>;
  }
  return <span className="fee-rates"><span>{t("fees.discounts")}</span><To /><span>{money(c.budget)}</span></span>;
}

function Delta({ c }) {
  const t = useStrings();
  if (c.kind === "removed") return <span className="fee-chg">{t("fees.dropped")}</span>;
  if (c.kind === "restructured") return <span className="fee-chg">{t("fees.flat")}</span>;
  const d = Math.round((c.budget - c.current) * 100) / 100;
  return (
    <span className="fee-chg">
      <span className="chg-glyph" aria-hidden="true">{d > 0 ? "▲" : "▼"}</span>
      {signedMoney(d)}
      {c.current > 0 && <span className="fee-pct"> ({signedPct(((c.budget - c.current) / c.current) * 100)})</span>}
    </span>
  );
}

// `cont`: same fee as the row above, so its name is not repeated on screen.
// `more`: the next row continues this one.
function FeeRow({ c, meta, cont, more }) {
  const t = useStrings();
  // A restructured fee's old terms are quoted as the city printed them.
  const note = c.kind === "restructured" ? t("fees.was", { year: meta.years.current, text: c.current_text }) : c.note && curly(c.note);
  return (
    <li className={"fee" + (cont ? " fee-cont" : "") + (more ? " fee-more" : "")}>
      <span className="fee-name" lang="en">
        {cont ? <span className="sr-only">{c.fee}</span> : c.fee}
        {c.detail && <span className="fee-detail">{curly(c.detail)}</span>}
      </span>
      <Rates c={c} />
      <Delta c={c} />
      {note && <p className="fee-note" lang={c.kind === "restructured" ? undefined : "en"}>{note}</p>}
    </li>
  );
}

export default function Fees({ fees, b, status }) {
  const t = useStrings();
  const { years } = b.meta;
  const all = useMemo(() => fees.groups.flatMap((g) => g.changes), [fees]);
  const tally = all.reduce((acc, c) => ({ ...acc, [direction(c)]: (acc[direction(c)] || 0) + 1 }), {});
  const offset = fees.source.printed_page_offset;
  const pageRange = `${fees.source.first_page - offset}–${fees.source.last_page - offset}`;

  // Largest percentage increases among ordinary rates, for the lead list.
  const biggest = useMemo(() => all
    .filter((c) => c.kind === "rate" && c.current > 0 && c.budget > c.current)
    .map((c) => ({ ...c, pct: ((c.budget - c.current) / c.current) * 100 }))
    .sort((a, z) => z.pct - a.pct)
    .slice(0, 5), [all]);

  return (
    <section id="fees" className="block">
      <SectionHead title={t("fees.title", years.budget)} status={status}>
        {t("fees.standfirst", {
          total: all.length, up: tally.up || 0, down: tally.down || 0,
          removed: tally.removed || 0, restructured: tally.restructured || 0,
        })}
      </SectionHead>

      <div className="fee-lead">
        <h3 className="fee-lead-title">{t("fees.leadTitle")}</h3>
        <ol className="fee-lead-list">
          {biggest.map((c) => (
            <li key={c.fee + c.detail}>
              <span className="fee-lead-name" lang="en">
                {c.fee}
                {c.detail && <span className="fee-detail">{curly(c.detail)}</span>}
              </span>
              <span className="fee-lead-rates">{money(c.current)}<To />{money(c.budget)}</span>
              <span className="fee-lead-pct">+{pct(c.pct, 0)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="fee-groups">
        {fees.groups.map((g) => {
          const ups = g.changes.filter((c) => direction(c) === "up").length;
          return (
            <details className="fee-group" key={g.name}>
              <summary>
                <span className="fee-group-text">
                  <span className="fee-group-name">{t(`feeGroup.${g.name}`)}</span>
                  <span className="fee-group-count">{t("fees.count", { n: g.changes.length, up: ups })}</span>
                </span>
                <ChevronDown className="fee-group-chev" size={18} strokeWidth={2} aria-hidden="true" />
              </summary>
              <div className="fee-cols" aria-hidden="true">
                <span>{t("fees.colFee")}</span><span>{t("fees.colRates", { prev: years.current, year: years.budget })}</span><span>{t("fees.colChange")}</span>
              </div>
              <ul className="fee-list">
                {g.changes.map((c, i, rows) => (
                  <FeeRow key={i} c={c} meta={b.meta}
                    cont={i > 0 && rows[i - 1].fee === c.fee} more={i < rows.length - 1 && rows[i + 1].fee === c.fee} />
                ))}
              </ul>
            </details>
          );
        })}
      </div>

      {fees.unclear.length > 0 && (
        <div className="callout callout-flag">
          <h3 className="callout-title">{t("fees.unclearTitle")}</h3>
          <ul className="fee-plain">
            {fees.unclear.map((u) => (
              <li key={u.fee}>
                <span lang="en"><b>{curly(u.fee)}.</b> {curly(u.note)}</span> {t("fees.page", printedPage(u.page, fees.source))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {fees.source_discrepancies.length > 0 && (
        <div className="callout callout-flag">
          <h3 className="callout-title">{t("fees.problemsTitle")}</h3>
          <ul className="fee-plain">
            {fees.source_discrepancies.map((d, i) => (
              <li key={i}><span lang="en">{curly(d.note)}</span> {t("fees.page", printedPage(d.page, fees.source))}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="note">{t("fees.note", { range: pageRange, prev: years.current, year: years.budget })}</p>
    </section>
  );
}
