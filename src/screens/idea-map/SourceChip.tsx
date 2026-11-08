"use client";

// One evidence source, the same everywhere on the map (Research card, the side panel's Evidence list and
// the evidence detail): the site's favicon and domain, its type ("Research", "Graveyard", ...), and ↗.
// The whole chip links to the source in a new tab. Sources with no URL (simulated ones, the founder's own
// notes) show the sprout instead of a favicon and aren't links.
import { useState, type MouseEvent } from "react";
import Sprout from "./Sprout";

export interface SourceInfo {
  url?: string;
  tier?: string; // simulated | researched | real
  source?: string; // "origin · domain", as the map model builds it
}

const domainOf = (url?: string) => {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};

/** "Research", "Graveyard", "Simulated", "You" … from the evidence's tier and origin. */
function typeOf(source: string, tier: string | undefined, domain: string) {
  if (tier === "simulated") return "Simulated";
  const origin = (domain && source.endsWith(` · ${domain}`) ? source.slice(0, -(domain.length + 3)) : source).trim();
  const o = origin.toLowerCase();
  if (o.startsWith("graveyard")) return "Graveyard";
  if (o.startsWith("research")) return "Research";
  if (o === "founder" || o.startsWith("added by you")) return "You";
  const head = origin.split(":")[0].trim();
  return head ? head[0].toUpperCase() + head.slice(1) : "Source";
}

function Favicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="src-fav src-fav-letter" aria-hidden="true">
        {domain[0]?.toUpperCase() ?? "?"}
      </span>
    );
  }
  return (
    // A plain <img> on purpose: next/image would need the Google host added to next.config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="src-fav"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      // Google answers "no favicon" with a 404 that still carries a generic 16×16 globe, which the browser
      // displays instead of firing onError. Real icons come back at 32–64px, so treat 16px as missing.
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= 16) setFailed(true);
      }}
    />
  );
}

export default function SourceChip({ url, tier, source = "" }: SourceInfo) {
  const domain = domainOf(url);
  const type = typeOf(source, tier, domain);
  if (!domain) {
    // No link to follow: simulated personas, the founder's own notes.
    return (
      <span className="src-chip src-chip-static" title={source || type}>
        <span className="src-fav src-fav-sprout" aria-hidden="true">
          <Sprout size={12} />
        </span>
        <span className="src-domain">{type === "You" ? "Added by you" : type}</span>
      </span>
    );
  }
  return (
    <a
      className="src-chip"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open source on ${domain}`}
      title={url}
      // The chip sits inside clickable rows; following the link shouldn't also select the row.
      onClick={(e: MouseEvent) => e.stopPropagation()}
    >
      <Favicon domain={domain} />
      <span className="src-domain">{domain}</span>
      <span className="src-type">{type}</span>
      <svg className="src-out" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17L17 7" />
        <path d="M8 7h9v9" />
      </svg>
    </a>
  );
}
