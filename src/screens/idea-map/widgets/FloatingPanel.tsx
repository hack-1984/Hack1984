"use client";

// The floating widget panel: a white rounded card over the right side of the map, left of the tab strip
// (design/lofi/lofi.png and design/sprout-mocks/App.dc.html). Its left edge is a grip that drags the
// width between PANEL_MIN and PANEL_MAX. While dragging, width is written straight to the DOM (and to the
// stage's --wg-occ, which the zoom controls and week bar position against), so the map doesn't re-render
// per pointer move; the final width is committed once on release.
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { PANEL_MAX, PANEL_MIN, STRIP_SPACE } from "../logic";

interface Props {
  open: boolean;
  width: number;
  label: string;
  onCommit: (w: number) => void;
  onLive: (w: number) => void;
  onClose: () => void;
  children: ReactNode;
}

const clamp = (w: number) => Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(w)));

export default function FloatingPanel({ open, width, label, onCommit, onLive, onClose, children }: Props) {
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; w: number; id: number } | null>(null);

  const live = (w: number) => {
    const el = panel.current;
    if (!el) return;
    el.style.width = `${w}px`;
    el.parentElement?.style.setProperty("--wg-occ", `${STRIP_SPACE + w + 16}px`);
    onLive(w);
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    drag.current = { x: e.clientX, w: panel.current?.offsetWidth ?? width, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.classList.add("wg-resizing");
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    live(clamp(d.w + (d.x - e.clientX))); // the grip is on the left edge: dragging left widens
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    document.body.classList.remove("wg-resizing");
    onCommit(clamp(panel.current?.offsetWidth ?? width));
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 48 : 16;
    const next =
      e.key === "ArrowLeft" ? width + step : e.key === "ArrowRight" ? width - step : e.key === "Home" ? PANEL_MIN : e.key === "End" ? PANEL_MAX : null;
    if (next === null) return;
    e.preventDefault();
    onCommit(clamp(next));
  };

  return (
    <aside ref={panel} className="wg-float" aria-label={label} hidden={!open} style={{ width: `${width}px` }}>
      <div
        className="wg-grip"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        aria-valuemin={PANEL_MIN}
        aria-valuemax={PANEL_MAX}
        aria-valuenow={width}
        tabIndex={0}
        title="Drag to resize"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <span aria-hidden="true" />
      </div>
      <button type="button" className="wg-close" aria-label="Close panel" title="Close panel" onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="wg-float-body">{children}</div>
    </aside>
  );
}
