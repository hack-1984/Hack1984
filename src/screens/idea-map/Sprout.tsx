// The leaf mark from public/brand/sprout-mark-only.svg, inline so it takes the theme colors.
export default function Sprout({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="4 6 40 48" aria-hidden="true">
      <g fill="none" stroke="var(--text)" strokeWidth="3.2" strokeLinecap="round">
        <path d="M24 46 V30" />
        <path d="M24 30 L15.5 20.5" />
        <path d="M24 30 L33.5 18.5" />
      </g>
      <circle cx="24" cy="48.5" r="4.6" fill="var(--text)" />
      <circle cx="12.5" cy="16.5" r="6.2" fill="var(--accent)" />
      <circle cx="36" cy="14" r="7.6" fill="var(--accent)" />
    </svg>
  );
}
