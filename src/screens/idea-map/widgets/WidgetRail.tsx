"use client";

// Vertical icon rail on the left edge of the map's sidebar. One widget shows at a time.
// Icons and sizes from design/sprout-mocks/App.dc.html; colors from the Sprout theme.
import type { ReactNode } from "react";

export type WidgetKey = "overview" | "launch" | "graveyard" | "customer" | "build" | "team";

const ICON = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const ITEMS: { key: WidgetKey; label: string; icon: ReactNode }[] = [
  {
    key: "overview",
    label: "Overview",
    icon: (
      <svg {...ICON}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <line x1="4" y1="10" x2="20" y2="10" />
        <line x1="10" y1="10" x2="10" y2="20" />
      </svg>
    ),
  },
  {
    key: "launch",
    label: "Launch day",
    icon: (
      <svg {...ICON}>
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M4 9v11h16V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    key: "graveyard",
    label: "Graveyard",
    icon: (
      <svg {...ICON}>
        <path d="M6 20V10a6 6 0 0 1 12 0v10" />
        <path d="M3 20h18" />
        <path d="M10 13h4" />
        <path d="M12 11v5" />
      </svg>
    ),
  },
  {
    key: "customer",
    label: "Discussions",
    icon: (
      <svg {...ICON}>
        <path d="M4 5h16v11H9l-5 4z" />
      </svg>
    ),
  },
  {
    key: "build",
    label: "Build",
    icon: (
      <svg {...ICON}>
        <path d="M14 3h7v7" />
        <path d="M21 3l-9 9" />
        <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
      </svg>
    ),
  },
  {
    key: "team",
    label: "Team",
    icon: (
      <svg {...ICON}>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M16 4.5a3 3 0 0 1 0 6" />
        <path d="M18 14.5c1.8.8 3 2.7 3 5" />
      </svg>
    ),
  },
];

export default function WidgetRail({ active, onPick, badge }: { active: WidgetKey; onPick: (w: WidgetKey) => void; badge: boolean }) {
  return (
    <nav aria-label="Widgets" className="wg-rail">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          type="button"
          className={`wg-rail-btn${active === it.key ? " is-active" : ""}`}
          aria-label={it.label + (it.key === "overview" && badge ? " (a suggestion is waiting)" : "")}
          aria-pressed={active === it.key}
          title={it.label}
          onClick={() => onPick(it.key)}
        >
          {it.icon}
          {it.key === "overview" && badge ? <span className="wg-rail-badge" aria-hidden="true" /> : null}
        </button>
      ))}
    </nav>
  );
}
