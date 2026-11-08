"use client";

// Numbers that move instead of jump (visual only). Used by IdeaMapScreen for every score that an
// update can change: pillar %, choice confidence, overall confidence, the Overview tallies, counts.
// The first render shows the value instantly; later changes ease over `duration` ms, with a
// `fx-tween-up` / `fx-tween-down` class on the span while moving so idea-map.css can tint and
// scale it. Honours prefers-reduced-motion (instant).
import { useEffect, useRef, useState } from "react";

const EASE = (t: number) => 1 - (1 - t) ** 3; // close to cubic-bezier(.2,.8,.2,1) for our purposes

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function TweenNumber({ value, duration = 600, format }: { value: number; duration?: number; format?: (v: number) => string }) {
  const target = Number.isFinite(value) ? value : 0;
  const [shown, setShown] = useState(target);
  const [dir, setDir] = useState<"" | "up" | "down">("");
  // The value currently on screen. Every animation starts from here, so a change back to an
  // earlier value, or a change that lands mid-flight, always ends on the real target.
  const shownRef = useRef(target);
  const raf = useRef(0);
  const settle = useRef(0);

  useEffect(() => {
    const start = shownRef.current;
    if (start === target) return;
    cancelAnimationFrame(raf.current);
    clearTimeout(settle.current);
    if (reduced()) {
      shownRef.current = target;
      raf.current = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(raf.current);
    }
    let t0 = 0;
    const step = (now: number) => {
      if (!t0) {
        // First frame: mark the direction, then start the clock.
        t0 = now;
        setDir(target > start ? "up" : "down");
      }
      const t = Math.min(1, (now - t0) / duration);
      const v = Math.round(start + (target - start) * EASE(t));
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else settle.current = window.setTimeout(() => setDir(""), 150);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(settle.current);
    };
  }, [target, duration]);

  return <span className={dir ? `fx-tween fx-tween-${dir}` : "fx-tween"}>{format ? format(shown) : String(shown)}</span>;
}

/** Returns a class name that is "im-pillar-pulse" for ~500ms after `value` changes (not on mount). */
export function usePulseOnChange(value: number | undefined): string {
  const prev = useRef(value);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    if (reduced()) return;
    const r = requestAnimationFrame(() => setOn(true));
    const t = window.setTimeout(() => setOn(false), 520);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
  }, [value]);
  return on ? " im-pillar-pulse" : "";
}

/** A pillar node that pulses once when its score changes. Wraps the existing node markup unchanged. */
export function PulseOnChange({ value, className, children, ...rest }: { value: number | undefined; className?: string } & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  const pulse = usePulseOnChange(value);
  return (
    <div {...rest} className={`${className ?? ""}${pulse}`.trim() || undefined}>
      {children}
    </div>
  );
}
