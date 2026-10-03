import React from "react";
import { ArrowUpRight } from "lucide-react";
import { parseIsoDate, curly } from "../format";
import { useStrings } from "../i18n.jsx";

// Committee and council amendments, from the hand-edited public/updates.json.
// Renders nothing until the log has entries. Entries are typed in English and
// stay in English in every language.
export default function Updates({ updates }) {
  const t = useStrings();
  if (!updates.length) return null;
  const sorted = [...updates].sort((a, c) => c.date.localeCompare(a.date));
  const fmt = (d) => t("fmt.date", parseIsoDate(d));
  return (
    <section id="updates" className="block block-updates" aria-labelledby="updates-title">
      <h2 id="updates-title" className="updates-title">{t("updates.title")}</h2>
      <p className="subnote">{t("updates.note")}</p>
      <ol className="updates">
        {sorted.map((u, i) => (
          <li key={i} className="update">
            <div className="update-meta"><time dateTime={u.date}>{fmt(u.date)}</time> &middot; <span lang="en">{curly(u.body)}</span></div>
            <p lang="en">{curly(u.summary)}</p>
            {u.url && (
              <a href={u.url} target="_blank" rel="noopener noreferrer">
                {t("updates.read")} <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
