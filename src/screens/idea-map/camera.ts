// Pan and zoom for the idea map, outside React.
//
// The camera is a translate + scale applied as ONE CSS transform on the world
// wrapper. Input events only update x / y / k here; the DOM is written at most
// once per animation frame. React never re-renders because the user panned or
// zoomed, which is what made the old scroll-and-setState version lag.

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2;

const clampK = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export type View = { x: number; y: number; k: number };

export class Camera {
  x = 0;
  y = 0;
  k = 1;
  private frame = 0;
  private anim = 0;
  private animTarget: View | null = null;

  /** `apply` writes the transform; it runs inside requestAnimationFrame. */
  constructor(private apply: (v: View) => void) {}

  /** Jump to a view (next frame). */
  set(v: View) {
    this.stop();
    this.x = v.x;
    this.y = v.y;
    this.k = clampK(v.k);
    this.schedule();
  }

  panBy(dx: number, dy: number) {
    this.stop();
    this.x += dx;
    this.y += dy;
    this.schedule();
  }

  /** Zoom by `factor`, keeping the screen point (px, py) fixed under the cursor. */
  zoomAt(px: number, py: number, factor: number) {
    this.stop();
    Object.assign(this, this.zoomed(this, px, py, factor));
    this.schedule();
  }

  /** Same as zoomAt, but eased over `ms`. Repeated calls stack on the pending target. */
  zoomAtAnimated(px: number, py: number, factor: number, ms = 200) {
    this.animateTo(this.zoomed(this.animTarget ?? this, px, py, factor), ms);
  }

  animateTo(target: View, ms = 260) {
    this.stop();
    const to = { ...target, k: clampK(target.k) };
    const from = { x: this.x, y: this.y, k: this.k };
    this.animTarget = to;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = easeOut(t);
      // Interpolate scale geometrically so the zoom speed feels even.
      this.k = from.k * (to.k / from.k) ** e;
      this.x = from.x + (to.x - from.x) * e;
      this.y = from.y + (to.y - from.y) * e;
      this.apply(this);
      this.anim = t < 1 ? requestAnimationFrame(step) : 0;
      if (t >= 1) this.animTarget = null;
    };
    this.anim = requestAnimationFrame(step);
  }

  stop() {
    if (this.anim) cancelAnimationFrame(this.anim);
    this.anim = 0;
    this.animTarget = null;
  }

  destroy() {
    this.stop();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private zoomed(v: View, px: number, py: number, factor: number): View {
    const k = clampK(v.k * factor);
    const wx = (px - v.x) / v.k;
    const wy = (py - v.y) / v.k;
    return { x: px - wx * k, y: py - wy * k, k };
  }

  private schedule() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.apply(this);
    });
  }
}
