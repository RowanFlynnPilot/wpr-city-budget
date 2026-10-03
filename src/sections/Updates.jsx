import React from "react";
import { ArrowUpRight } from "lucide-react";
import { apDate, curly } from "../format";

// Committee and council amendments, from the hand-edited public/updates.json.
// Renders nothing until the log has entries.
export default function Updates({ updates }) {
  if (!updates.length) return null;
  const sorted = [...updates].sort((a, c) => c.date.localeCompare(a.date));
  const fmt = (d) => apDate(new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
  return (
    <section id="updates" className="block block-updates" aria-labelledby="updates-title">
      <h2 id="updates-title" className="updates-title">Changes since the proposal</h2>
      <p className="subnote">
        The figures below are the mayor&rsquo;s proposal. These are the changes made since, newest first.
      </p>
      <ol className="updates">
        {sorted.map((u, i) => (
          <li key={i} className="update">
            <div className="update-meta"><time dateTime={u.date}>{fmt(u.date)}</time> &middot; {curly(u.body)}</div>
            <p>{curly(u.summary)}</p>
            {u.url && (
              <a href={u.url} target="_blank" rel="noopener noreferrer">
                Read the story <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
