// Logic for the IdeaMap screen, from the Claude Design file "Idea Map.dc.html".
// Changes from the design: page links point at app routes, keyframe names carry the "im-" prefix,
// colors come from the Sprout theme variables (globals.css), and there is no canned idea: the map
// shows a saved idea (/map?id=…, else the most recent, else it sends you to plant one).
//
// Data model: the stored Idea (src/lib/db) is the source of truth. The map's choices and links
// are derived from it with toMapModel(); every founder or widget action is a TreeUpdate applied with
// applyUpdates() and saved, then the map is re-derived. Nothing map-shaped is persisted.
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
import { Session } from "@/session";
import { PILLARS as PILLAR_DEFS, PILLAR_KEYS, pillarLabel } from "@/lib/pillars";
import { adopt, applyUpdates, describeUpdates, ideaStore, reject as rejectChoice, toMapModel } from "@/lib/db";
import { planChoice, researchChoice } from "@/ideas/api";
import { profileFor } from "@/lib/modes";
import { Camera, MIN_ZOOM, MAX_ZOOM } from "./camera";
import { pillarScores } from "@/lib/db";
import { emitFx, WIDGET_FOR_SOURCE } from "./fx/bus";
const PILLARS = PILLAR_DEFS.map(p => p.startup);
const LABEL = Object.fromEntries(PILLAR_DEFS.map(p => [p.key, p.startup]));
// The startup labels stay the map's internal identity: they key FX, the
// angles, `expanded`, and every c.pillar comparison. Nonprofit labels differ
// only on screen, so they are translated back through the key at the three
// places a pillar name is actually rendered -- see show() below.
const KEY_OF = Object.fromEntries(PILLAR_DEFS.map(p => [p.startup, p.key]));
// App: who a choice's Challenge button talks to, by pillar. Keyed on the
// pillar KEY, so it holds in both modes — only the role's display name
// differs there (profileFor(mode).roles).
const ROLE_FOR_PILLAR = { customer:'customer', problem:'customer', solution:'customer', edge:'competitor', reach:'competitor', revenue:'investor', risks:'investor', approach:'investor' };
const FX = {
  Customer:{glyph:'●', sizes:['6px'], dur:'4s', inner:'none'},
  Problem:{glyph:'?', sizes:['10px'], dur:'4s', inner:'none'},
  Solution:{glyph:'✓', sizes:['10px'], dur:'4s', inner:'none'},
  Approach:{glyph:'▸', sizes:['9px'], dur:'4s', inner:'none'},
  Edge:{glyph:'◆', sizes:['8px'], dur:'4s', inner:'none'},
  Reach:{glyph:'↗', sizes:['10px'], dur:'4s', inner:'none'},
  Revenue:{glyph:'$', sizes:['10px'], dur:'4s', inner:'none'},
  Risks:{glyph:'!', sizes:['10px'], dur:'4s', inner:'none'},
};
const SCORE = {strengthened:1, added:.6, guess:.4, weakened:.2, removed:0};
export const STATUS = {
  strengthened:{label:'Strengthened', dot:'var(--green)', dotBorder:'transparent', border:'var(--green-line)', bg:'var(--surface)', color:'var(--text)', style:'solid', chipBg:'var(--green-tint)', chipFg:'var(--green-text)'},
  added:{label:'Added', dot:'var(--surface)', dotBorder:'var(--muted)', border:'var(--border)', bg:'var(--surface)', color:'var(--text)', style:'solid', chipBg:'var(--surface-2)', chipFg:'var(--muted)'},
  guess:{label:'Guess', dot:'var(--surface)', dotBorder:'var(--muted)', border:'var(--border)', bg:'var(--surface)', color:'var(--text)', style:'solid', chipBg:'var(--surface-2)', chipFg:'var(--muted)'},
  weakened:{label:'Weakened', dot:'var(--red)', dotBorder:'transparent', border:'var(--red-line)', bg:'var(--surface)', color:'var(--text)', style:'solid', chipBg:'var(--red-tint)', chipFg:'var(--red-text)'},
  removed:{label:'Removed', dot:'var(--border)', dotBorder:'transparent', border:'var(--border)', bg:'var(--surface-2)', color:'var(--muted)', style:'solid', chipBg:'var(--surface-2)', chipFg:'var(--muted)'},
  suggested:{label:'Suggested', dot:'var(--surface)', dotBorder:'var(--accent)', border:'var(--accent)', bg:'var(--surface)', color:'var(--text)', style:'dashed', chipBg:'var(--accent)', chipFg:'var(--on-accent)'},
};
const TYPE_COLOR = {Strengthened:'var(--green-text)', Added:'var(--text)', Weakened:'var(--red-text)', Removed:'var(--muted)', Suggested:'var(--green-text)'};
const TYPE_DOT = {Strengthened:'var(--green)', Added:'var(--muted)', Weakened:'var(--red)', Removed:'var(--border)', Suggested:'var(--accent)'};
const SUMMARY = {
  strengthened:'Well supported. New evidence has backed this choice.',
  added:'New choice that emerged from what the team learned.',
  guess:'An assumption with no evidence yet.',
  weakened:'Evidence casts doubt. Test it or replace it.',
  removed:'Evidence showed this doesn’t work. Kept for history.',
  suggested:'Proposed replacement. Waiting for the founder to accept or reject.',
};
const CX = 670, CY = 550, R1 = 200, R2 = 385, R3 = 560;
const pol = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };
// App: lay out pills on a ring of radius r without overlaps. Items sort by their wanted angle, then
// neighbours are pushed apart until each pair is at least the space the two pills need along the ring
// (a 156×44 pill needs more room where the ring runs sideways than where it runs up and down).
const spread = (items, r, s) => {
  if (!items.length) return r;
  const need = a => { const t = (a - 90) * Math.PI / 180; return (Math.abs(Math.sin(t)) * 156 + Math.abs(Math.cos(t)) * 44) * s + 16; };
  items.sort((a, b) => a.want - b.want).forEach(it => { it.ang = it.want; });
  const total = items.reduce((a, it) => a + need(it.want), 0);
  const R = Math.max(r, total * 1.08 / (2 * Math.PI));
  if (items.length < 2) return R;
  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      const A = items[i], B = items[(i + 1) % items.length];
      const gap = B.ang - A.ang + (i === items.length - 1 ? 360 : 0);
      const min = (need(A.ang) + need(B.ang)) / 2 / R * 180 / Math.PI;
      if (gap < min - 0.01) { const d = (min - gap) / 2; A.ang -= d; B.ang += d; moved = true; }
    }
    if (!moved) break;
  }
  return R;
};
const line = (a, b) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
const seg = (a, b, o) => { /* o.id: stable React key */ const dx = b[0] - a[0], dy = b[1] - a[1]; return { x: a[0], y: a[1], len: Math.hypot(dx, dy), rot: Math.atan2(dy, dx) * 180 / Math.PI, style: o.dash ? 'dashed' : 'solid', ...o }; };
const wkLabel = n => 'wk ' + n;
// Signal thresholds, the same ones the landing page teaches: green from 70, amber from 45, red below.
export const confColor = v => v >= .70 ? 'var(--green)' : v >= .45 ? 'var(--amber)' : 'var(--red)';
// Small text in a signal color uses the darker -text shades so it stays readable.
export const confText = v => v >= .70 ? 'var(--green-text)' : v >= .45 ? 'var(--amber-text)' : 'var(--red-text)';
// App: a choice's confidence as a small ring in the pillars' language: one signal colour filling
// conf% of the circle over the --border track, the number inside. Removed choices get a flat grey ring.
export const confRing = (conf, lo, hi, status) => {
  if (status === 'removed') return { ring: 'var(--border)', text: 'var(--muted)', pct: conf, lo, hi };
  const v = conf / 100;
  return { ring: `conic-gradient(${confColor(v)} ${(conf * 3.6).toFixed(1)}deg, var(--border) 0)`, ringDeg: `${(conf * 3.6).toFixed(1)}deg`, ringCol: confColor(v), text: confText(v), pct: conf, lo, hi };
};
const ACTIVE_SHADOW = '0 0 0 3px var(--focus-ring), 0 4px 12px var(--shadow)';
const statusAt = (c, W) => {
  const h = c.hist.filter(x => x.wk <= W); if (!h.length) return null;
  const last = h[h.length - 1];
  if (last.type === 'Strengthened') return 'strengthened';
  if (last.type === 'Weakened') return 'weakened';
  if (last.type === 'Removed') return 'removed';
  if (last.type === 'Suggested') return 'suggested';
  return W - last.wk <= 1 ? 'added' : 'guess';
};

// App: floating widget panel. Width is a per-viewer preference (320–560px); the tab strip sits outside it.
export const PANEL_MIN = 320, PANEL_MAX = 560;
// Space the panel + tab strip take on the right of the canvas: strip (56) + its 16px margin + 12px gap, and the open panel + 16px.
export const STRIP_SPACE = 84;
const readPanelW = () => { try { const w = Number(localStorage.getItem('sprout.panelW')); return w >= PANEL_MIN && w <= PANEL_MAX ? w : 400; } catch { return 400; } };
const urlId = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('id'));

class Component extends DCLogic {
  constructor(p) {
    super(p);
    this.idea = null; this.ideaId = null; this.team = null; this.now = 1; this.name = ''; this.pitch = '';
    this.state = { sel:null, hoverIdea:false, hover:null, draft:'', toast:null, expanded:[], loading:true, missing:false, discuss:null, nodeBusy:null,
      choices: [], links: [], wmem: {}, widget: 'overview', flash: null, pinEv: null, panelOpen: true, panelW: readPanelW() };
  }
  // The label to SHOW for a pillar the map holds internally as a startup
  // label: "Customer" stays "Customer" on a startup, becomes "People served"
  // on a nonprofit. Identity is unchanged either way.
  show(p) { return pillarLabel(KEY_OF[p] ?? p, this.idea?.mode === 'nonprofit' ? 'nonprofit' : 'startup'); }
  // App: the map's drawing data, derived from the stored Idea. Pillar names are the design's startup labels (they key FX and angles).
  derive(idea) {
    const m = toMapModel(idea, this.team);
    this.idea = idea; this.ideaId = idea.id; this.now = m.now; this.name = m.title; this.pitch = m.description || idea.pitch;
    return { choices: m.choices.map(c => ({ ...c, pillar: LABEL[c.pillarKey] })), links: m.links, wmem: idea.widgets || {}, loading: false, missing: false };
  }
  // First load of an idea: derive and reset the view.
  load(idea) { return { ...this.derive(idea), sel: null, expanded: [], widget: 'overview', flash: null, panelOpen: true }; }
  // App: a changed Idea in, saved and re-drawn. Save failures surface as a toast; the map keeps the new state.
  persist(idea, patch, msg) {
    this.setState({ ...this.derive(idea), ...(patch || {}) });
    if (msg) this.say(msg);
    ideaStore().save(idea).catch(err => { console.error('[map] save', err); this.say('Could not save that. Check your connection.'); });
  }
  async componentDidMount() {
    // App: Next keeps this page alive (hidden) between visits, so a different ?id= means a different idea.
    await Session.ready(); if (!Session.getSession()) { location.replace('/login'); return; }
    const store = ideaStore();
    try {
      if (!this.team) this.team = await store.getTeam().catch(() => null);
      let id = urlId();
      if (!id) {
        const list = await store.list();
        if (!list.length) { location.replace('/new'); return; }
        id = list[0].id; history.replaceState(null, '', `/map?id=${encodeURIComponent(id)}`);
      }
      if (id !== this.ideaId) {
        const idea = await store.get(id);
        if (!idea) { this.setState({ loading: false, missing: true }); return; }
        this._fitted = false;
        this.setState(this.load(idea), () => this.fit(false));
      }
    } catch (err) { console.error('[map] load', err); this.setState({ loading: false, missing: true }); }
    this._key = (e) => {
      if (e.target && (/TEXTAREA|INPUT/.test(e.target.tagName) || e.target.isContentEditable)) return;
      // App: Cmd/Ctrl+Z undoes the last change a feature (or the founder) sent to the tree.
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') { if (this.canUndo()) { e.preventDefault(); this.undoLast(); } return; }
      if (e.key === 'Escape') this.setState({sel:null, pinEv:null});
      if (e.key === '+' || e.key === '=') this.zoomStep(1.25);
      if (e.key === '-') this.zoomStep(1 / 1.25);
      if (e.key === '0') this.fit();
    };
    window.addEventListener('keydown', this._key);
  }
  componentWillUnmount() { window.removeEventListener('keydown', this._key); clearTimeout(this._toastT); clearTimeout(this._flashT); }

  // ---- App: pan and zoom (camera.ts). Nothing here calls setState. ----
  worldRef = React.createRef();
  pctRef = React.createRef();
  camera = new Camera(v => this.applyView(v));
  applyView({ x, y, k }) {
    const w = this.worldRef.current, pane = this._pane;
    if (w) {
      w.style.transform = `translate3d(${x}px,${y}px,0) scale(${k})`;
      w.style.setProperty('--k', String(k)); // ResearchCard counter-scales by this so it stays screen-sized
      // will-change only while moving: it keeps frames cheap, and dropping it afterwards lets text re-rasterize crisply.
      w.style.willChange = 'transform'; clearTimeout(this._settle); this._settle = setTimeout(() => { if (this.worldRef.current) this.worldRef.current.style.willChange = 'auto'; }, 160);
    }
    if (pane) { let g = 24 * k; while (g < 12) g *= 2; pane.style.backgroundSize = `${g}px ${g}px`; pane.style.backgroundPosition = `${x}px ${y}px`; }
    if (this.pctRef.current) this.pctRef.current.textContent = Math.round(k * 100) + '%';
  }
  // Frame every visible node. Bounds come from the last render (renderVals stores them).
  // App: px on the right covered by the floating panel and tab strip (0 for the panel when collapsed).
  // During a grip drag the screen sets _dragW so fitting uses the live width.
  occupied() { const w = this._dragW || this.state.panelW; return STRIP_SPACE + (this.state.panelOpen ? Math.min(w, (this._pane ? this._pane.clientWidth : 1200) - STRIP_SPACE - 120) + 16 : 0); }
  fitView() {
    const pane = this._pane, b = this._bounds; if (!pane || !b || !pane.clientWidth) return null;
    const top = 64, bottom = 76, side = 40; // clear the zoom controls and the bottom bar
    const vw = Math.max(200, pane.clientWidth - this.occupied() - side * 2), vh = pane.clientHeight - top - bottom;
    const k = Math.min(Math.max(Math.min(vw / (b.maxX - b.minX), vh / (b.maxY - b.minY), 1.4), MIN_ZOOM), MAX_ZOOM);
    return { k, x: side + vw / 2 - (b.minX + b.maxX) / 2 * k, y: top + vh / 2 - (b.minY + b.maxY) / 2 * k };
  }
  fit(animate = true) {
    const v = this.fitView(); if (!v) return false;
    if (animate) this.camera.animateTo(v, 320); else this.camera.set(v);
    this._fitted = true; return true;
  }
  reveal(keys) {
    const pane = this._pane, boxes = this._boxes || {}; if (!pane) return;
    const { x, y, k } = this.camera; const m = 12;
    const off = [...keys, 'orbit'].map(key => boxes[key]).filter(Boolean).some(b => b.minX * k + x < m || b.maxX * k + x > pane.clientWidth - this.occupied() - m || b.minY * k + y < 56 || b.maxY * k + y > pane.clientHeight - 72);
    if (off) this.fit();
  }
  // App: for the Research card. The visible canvas in client px (left of the panel, clear of the controls),
  // and a pan just big enough to bring a client-px box into it (both the node and its card).
  researchView = {
    viewport: () => {
      const pane = this._pane; if (!pane) return null; const r = pane.getBoundingClientRect();
      return { left: r.left + 16, top: r.top + 60, right: r.left + pane.clientWidth - this.occupied() - 16, bottom: r.top + pane.clientHeight - 80 };
    },
    ensureVisible: (box) => {
      const v = this.researchView.viewport(); if (!v) return;
      const fit = (lo, hi, a, b) => (b - a > hi - lo ? lo - a : a < lo ? lo - a : b > hi ? hi - b : 0);
      const dx = fit(v.left, v.right, box.left, box.right), dy = fit(v.top, v.bottom, box.top, box.bottom);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const c = this.camera; c.animateTo({ x: c.x + dx, y: c.y + dy, k: c.k }, 250);
    },
  };
  zoomStep(f) { const pane = this._pane; if (!pane) return; this.camera.zoomAtAnimated(pane.clientWidth / 2, pane.clientHeight / 2, f, 180); }
  // Callback ref for the canvas: attaches input listeners whenever the element mounts (including after
  // Next re-shows this page), and frames the map the first time.
  setPane = (el) => {
    if (el === this._pane) return;
    if (this._pane) this.detachInput(this._pane);
    this._pane = el;
    if (!el) return;
    this.attachInput(el);
    if (!this._fitted) { let tries = 0; const go = () => { if (!this.fit(false) && tries++ < 20) requestAnimationFrame(go); }; requestAnimationFrame(go); }
    else this.applyView(this.camera);
  };
  attachInput(pane) {
    const cam = this.camera; const pts = new Map();
    const isNode = t => t && t.closest && t.closest('[data-node],button,a,input,textarea,select');
    const local = e => { const r = pane.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let lastCtrlWheel = 0, gestureK = 1;
    const down = e => {
      this._suppressClick = false;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (isNode(e.target)) return; // nodes and buttons keep their clicks
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) this._drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, active: false };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; this._pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; this.startDrag(e); }
    };
    const move = e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2 && this._pinch) { // touch pinch: zoom about the midpoint, and pan with it
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const r = pane.getBoundingClientRect(); cam.zoomAt(mx - r.left, my - r.top, d / (this._pinch.d || d)); cam.panBy(mx - this._pinch.mx, my - this._pinch.my);
        this._pinch = { d, mx, my }; return;
      }
      const g = this._drag; if (!g || g.id !== e.pointerId) return;
      if (!g.active) { if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 5) return; this.startDrag(e); }
      cam.panBy(e.clientX - g.lx, e.clientY - g.ly); g.lx = e.clientX; g.ly = e.clientY;
    };
    const up = e => {
      pts.delete(e.pointerId); if (pts.size < 2) this._pinch = null;
      const g = this._drag;
      if (g && (g.id === e.pointerId || !pts.size)) { if (g.active) this._suppressClick = true; this._drag = null; this._dragging = false; pane.classList.remove('im-grabbing'); }
    };
    const wheel = e => {
      if (!(e.ctrlKey || e.metaKey) && e.target && e.target.closest && e.target.closest('[data-scroll]')) return; // let the Research card's list scroll
      e.preventDefault();
      const m = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? pane.clientHeight : 1;
      if (e.ctrlKey || e.metaKey) { // trackpad pinch arrives as ctrl+wheel; ⌘/ctrl + mouse wheel too
        lastCtrlWheel = performance.now();
        const z = Math.max(-0.5, Math.min(0.5, -e.deltaY * m * 0.01));
        const [px, py] = local(e); cam.zoomAt(px, py, 2 ** z);
      } else cam.panBy(-e.deltaX * m, -e.deltaY * m); // two-finger scroll pans
    };
    // Safari reports trackpad pinch as gesture events rather than ctrl+wheel.
    const gStart = e => { e.preventDefault(); gestureK = cam.k; };
    const gChange = e => { e.preventDefault(); if (performance.now() - lastCtrlWheel < 200) return; const [px, py] = local(e); cam.zoomAt(px, py, (gestureK * e.scale) / cam.k); };
    pane.addEventListener('pointerdown', down); pane.addEventListener('pointermove', move);
    pane.addEventListener('pointerup', up); pane.addEventListener('pointercancel', up);
    pane.addEventListener('wheel', wheel, { passive: false });
    pane.addEventListener('gesturestart', gStart); pane.addEventListener('gesturechange', gChange);
    this._detach = () => {
      pane.removeEventListener('pointerdown', down); pane.removeEventListener('pointermove', move);
      pane.removeEventListener('pointerup', up); pane.removeEventListener('pointercancel', up);
      pane.removeEventListener('wheel', wheel); pane.removeEventListener('gesturestart', gStart); pane.removeEventListener('gesturechange', gChange);
    };
  }
  detachInput() { if (this._detach) this._detach(); this._detach = null; this.camera.stop(); }
  startDrag(e) {
    const g = this._drag; if (!g || g.active) return;
    g.active = true; this._dragging = true; this.camera.stop();
    try { this._pane.setPointerCapture(e.pointerId); } catch {}
    this._pane.classList.add('im-grabbing');
    if (this.state.hover || this.state.hoverIdea) this.setState({ hover: null, hoverIdea: false });
  }
  say(msg, ms = 2600) { clearTimeout(this._toastT); this.setState({toast: msg}); this._toastT = setTimeout(() => this.setState({toast:null}), ms); }
  pick(sel) { return (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.setState(s => { let expanded = s.expanded; const cid = sel && (sel.t === 'choice' ? sel.id : sel.t === 'evidence' ? sel.cid : null); if (cid) { const c = s.choices.find(x => x.id === cid); if (c && !expanded.includes(c.pillar)) expanded = [...expanded, c.pillar]; } if (sel && sel.t === 'pillar' && !expanded.includes(sel.id)) expanded = [...expanded, sel.id]; return { sel, draft:'', expanded, widget: 'overview', panelOpen: true }; }, () => this.reveal(this.state.expanded)); }; }
  hoverOn(k) { return () => { if (!this._dragging) this.setState({ hover: k }); }; }
  hoverOff(k) { return () => this.setState(s => s.hover === k ? { hover: null } : null); }
  togglePillar(p) { return (e) => { e.stopPropagation(); this.setState(s => { const open = s.expanded.includes(p); const selected = s.sel && s.sel.t === 'pillar' && s.sel.id === p; if (open && selected) return { expanded: s.expanded.filter(x => x !== p), sel: null }; return { expanded: open ? s.expanded : [...s.expanded, p], sel: {t:'pillar', id:p}, draft:'', widget: 'overview', panelOpen: true }; }, () => this.reveal([p])); }; }
  pillarScore(W, p) {
    const cs = this.state.choices.map(c => ({c, st: statusAt(c, W)})).filter(x => x.c.pillar === p && x.st && x.st !== 'suggested' && x.st !== 'removed');
    return cs.length ? cs.reduce((a, x) => a + SCORE[x.st], 0) / cs.length : null;
  }
  overall(W) { const s = PILLARS.map(p => this.pillarScore(W, p)).filter(x => x !== null); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0; }

  renderVals() {
    const showRemoved = this.props.showRemoved ?? true;
    const dim = this.props.dimUnrelated ?? true;
    const { sel, choices: allC } = this.state;
    // App: the map always shows the current week. Weeks still number history rows and evidence,
    // but there is no scrubber or replay; founders iterate on the live tree instead.
    const W = this.now, LINKS = this.state.links;
    const view = allC.map(c => ({ ...c, status: statusAt(c, W), ev: c.ev.filter(e => e.wk <= W), hist: c.hist.filter(h => h.wk <= W) })).filter(c => c.status && (showRemoved || c.status !== 'removed'));
    const byId = Object.fromEntries(view.map(c => [c.id, c]));
    const find = id => byId[id];

    const mode = !sel ? 'idea' : sel.t;
    const selC = (mode === 'choice' && find(sel.id)) || (mode === 'evidence' && find(sel.cid)) || null;
    const selPillar = mode === 'pillar' ? sel.id : selC ? selC.pillar : null;
    const related = new Set();
    if (selC) { related.add(selC.id); LINKS.forEach(([a, b]) => { if (a === selC.id) related.add(b); if (b === selC.id) related.add(a); }); }
    if (mode === 'pillar') view.filter(c => c.pillar === sel.id).forEach(c => related.add(c.id));
    const focused = mode !== 'idea';
    const isDim = id => dim && focused && !related.has(id);

    const H = this.state.hover; const hov = (key, base) => !H || !H.startsWith('p:') ? base : H === key ? base * 1.1 : base * .8;
    const pillarAng = {}; PILLARS.forEach((p, i) => pillarAng[p] = i * 45);
    const pillarActive0 = p => selPillar === p;
    const pR = p => (focused && !pillarActive0(p)) ? R1 * .66 : R1;
    const pPos = p => pol(pR(p), pillarAng[p]);
    const rows = [];
    const expanded = this.state.expanded;
    // App: each choice wants to sit near its pillar's angle (24° apart, as designed); spread() then pushes
    // neighbours apart until no two pills overlap, growing the ring if they can't all fit.
    // App: while a pillar or choice is focused, the other open pillars' choices leave the map instead of
    // shrinking onto an inner ring. With many pillars open the greyed-out pills just cluttered the view;
    // the pillars stay expanded, so they come straight back when focus clears.
    PILLARS.forEach(p => { if (!expanded.includes(p) || (focused && !pillarActive0(p))) return; const cs = view.filter(c => c.pillar === p); cs.forEach((c, j) => { rows.push({ c, j, want: pillarAng[p] + (j - (cs.length - 1) / 2) * 24 }); }); });
    const ringR = spread(rows, R2, 1);
    rows.forEach(r => { const [x, y] = pol(ringR, r.ang); r.x = x; r.y = y; });
    const R3x = Math.max(R3, ringR + 175);
    const rowOf = id => rows.find(r => r.c.id === id);

    const edges = [], curves = [];
    const pillarActive = pillarActive0;
    PILLARS.forEach(p => { const d = dim && focused && !pillarActive(p); edges.push(seg([CX, CY], pPos(p), { id: 'pe:' + p, stroke: 'var(--border)', w: 1.5, dash: false, op: 1 })); });
    rows.forEach(({ c, x, y }) => { const d = isDim(c.id); edges.push(seg(pPos(c.pillar), [x, y], { id: 'ce:' + c.id, stroke: c.status === 'removed' ? 'var(--border)' : c.status === 'weakened' ? 'var(--red-line)' : 'var(--border)', w: 1.25, dash: c.status === 'suggested', op: d ? .4 : .7 })); });
    LINKS.forEach(([a, b]) => { const ra = rowOf(a), rb = rowOf(b); if (!ra || !rb) return; const hi = selC && (selC.id === a || selC.id === b); const m = pol(ringR + 70, (ra.ang + rb.ang) / 2); curves.push({ d: `M${ra.x} ${ra.y} Q${m[0]} ${m[1]} ${rb.x} ${rb.y}`, stroke: 'var(--muted)', w: 1.25, dash: '3 3', op: hi ? .9 : .4 }); });

    const orbit = []; const seen = {}; const uniq = k => (seen[k] = (seen[k] || 0) + 1) > 1 ? k + '#' + seen[k] : k;
    const evItem = (c, e, i) => { const key = c.id + ':' + i; return { text: e.text, kind: e.k === 'support' ? 'for' : 'against', accent: e.k === 'support' ? 'var(--green)' : 'var(--red)', kindColor: e.k === 'support' ? 'var(--green-text)' : 'var(--red-text)', key, ev: e, choice: c, enter: this.hoverOn('e:' + key), leave: this.hoverOff('e:' + key), select: (ev) => { ev.stopPropagation(); this.setState(s => ({ pinEv: s.pinEv && s.pinEv.cid === c.id && s.pinEv.idx === i ? null : { cid: c.id, idx: i } })); } }; };
    const fan = (items, cx, cy, ang, step) => items.forEach((it, i) => { const a = ang + (i - (items.length - 1) / 2) * step; const [x, y] = pol(R3x, a); const pinKey = this.state.pinEv ? this.state.pinEv.cid + ':' + this.state.pinEv.idx : null; const pinned = pinKey === it.key; const active = pinned || (mode === 'evidence' && it.key === sel.cid + ':' + sel.idx); const oid = uniq('o:' + it.key); orbit.push({ ...it, id: oid, pinned, x, y, delay: (i * .06) + 's', scale: 1, enter: it.enter || null, leave: it.leave || null, border: active ? 'var(--accent)' : 'var(--border)', shadow: active ? ACTIVE_SHADOW : '0 2px 8px var(--shadow)' }); edges.push(seg([cx, cy], [x, y], { id: 'f' + oid, stroke: active ? 'var(--accent)' : 'var(--border)', w: 1.25, dash: false, op: .85 })); });
    if (selC) { const r = rowOf(selC.id); if (r) fan(selC.ev.map((e, i) => evItem(selC, e, i)), r.x, r.y, r.ang, 15); }
    if (mode === 'pillar') { view.filter(c => c.pillar === sel.id).forEach(c => { const r = rowOf(c.id); const items = c.ev.map((e, i) => evItem(c, e, i)).slice(0, 4); fan(items, r.x, r.y, r.ang, 12); }); }

    // App: the Research card. Opened by clicking an evidence node; it grows out of that node on a vine and is
    // anchored to it (ResearchCard.tsx). It lists every source behind that evidence's choice, like the landing
    // page's card; rows open the evidence. Closes with ×, Escape, or a click on empty canvas.
    let evCard = null;
    const pin = this.state.pinEv && find(this.state.pinEv.cid) ? this.state.pinEv : null;
    const cardC = pin && find(pin.cid);
    const pinKey = pin ? pin.cid + ':' + pin.idx : null;
    const anchorNode = pinKey ? orbit.find(o => o.key === pinKey) : null; // the node must be on the map to anchor to
    if (cardC && cardC.ev.length && anchorNode) {
      evCard = { key: pinKey, title: cardC.text, count: cardC.ev.length, pillar: cardC.pillar, anchor: { x: anchorNode.x, y: anchorNode.y },
        rows: cardC.ev.map((e, i) => ({ text: e.text, source: e.source, url: e.url, tier: e.tier, tag: e.k === 'support' ? 'FOR' : 'AGAINST', accent: e.k === 'support' ? 'var(--green)' : 'var(--red)', tagColor: e.k === 'support' ? 'var(--green-text)' : 'var(--red-text)', active: i === pin.idx,
          select: (ev) => { this.pick({t:'evidence', cid:cardC.id, idx:i})(ev); this.setState({ pinEv: { cid: cardC.id, idx: i } }); } })),
        close: (ev) => { if (ev) ev.stopPropagation(); this.setState({ pinEv: null }); } };
    }

        const particles = [], flows = [];
    PILLARS.forEach((p, i) => {
      if (dim && focused && !pillarActive(p)) return;
      const fx = FX[p]; const a = pol(58, pillarAng[p]), b = pol(pR(p) - 40, pillarAng[p]);
      const path = `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      fx.sizes.forEach((size, j) => particles.push({ path, glyph: fx.glyph, size, dur: fx.dur, delay: `${(-(j * parseFloat(fx.dur) / fx.sizes.length) - i * .37).toFixed(2)}s`, inner: fx.inner }));
    });

    const pillarInfo = p => { const avg = this.pillarScore(W, p); const v = avg ?? 0; return { avg: v, has: avg !== null, pct: Math.round(v * 100), label: avg === null ? 'Empty' : v >= .70 ? 'Strong' : v >= .45 ? 'Mixed' : 'Weak', labelColor: confText(v), ringColor: confColor(v) }; };
    const pillars = PILLARS.map(p => {
      const info = pillarInfo(p); const active = pillarActive(p); const [x, y] = pPos(p); const shrunk = focused && !active; const hk = 'p:' + p;
      const nC = view.filter(c => c.pillar === p && c.status !== 'removed').length; const open = expanded.includes(p); const i = PILLARS.indexOf(p);
      const fl = this.state.flash && this.state.flash.pillars.includes(p) ? this.state.flash : null;
      return { key: KEY_OF[p], flashing: !!fl, flashText: fl ? fl.text : '', flashKey: fl ? fl.key : 0, name: this.show(p), x, y, glyph: FX[p].glyph, delay: (i * .05) + 's', rowDelay: (i * .04) + 's', badge: open ? '–' : nC, badgeBg: open ? 'var(--accent)' : 'var(--surface)', badgeBorder: open ? 'var(--surface)' : 'var(--border)', badgeFg: open ? 'var(--on-accent)' : 'var(--text)', badgeDelay: (.3 + i * .05) + 's', ring: `conic-gradient(${info.ringColor} ${Math.round(info.avg * 360)}deg, var(--border) 0)`, ringDeg: `${Math.round(info.avg * 360)}deg`, ringCol: info.ringColor, title: `${info.label} · ${info.pct}%`, shadow: active ? '0 0 0 4px var(--focus-ring)' : '0 1px 2px var(--shadow)', pct: info.pct, label: info.label, labelColor: info.labelColor, op: shrunk ? .85 : 1, scale: hov(hk, shrunk ? .66 : 1), select: this.togglePillar(p), enter: this.hoverOn(hk), leave: this.hoverOff(hk) };
    });
    const choiceRow = c => { const st = STATUS[c.status]; return { dot: st.dot, dotBorder: st.dotBorder, deco: c.status === 'removed' ? 'line-through' : 'none', text: c.text, sub: `${st.label} · ${c.ev.length} evidence`, select: this.pick({t:'choice', id:c.id}) }; };
    const choices = rows.map(({ c, x, y, j }) => {
      const st = STATUS[c.status]; const active = selC && selC.id === c.id; const d = isDim(c.id);
      const [lo, hi] = c.interval || [c.confidence, c.confidence]; const cr = confRing(c.confidence, lo, hi, c.status);
      return { id: c.id, ghost: c.status !== 'removed' && c.ghost ? c.ghost : '', x, y, delay: (j * .07) + 's', scale: 1, pe: 'auto', enter: null, leave: null, text: c.text, bg: st.bg, dotBorder: st.dotBorder, border: active ? 'var(--accent)' : st.border, borderStyle: st.style, color: st.color, dot: st.dot, deco: c.status === 'removed' ? 'line-through' : 'none', shadow: active ? ACTIVE_SHADOW : '0 1px 2px var(--shadow)',
        ring: cr.ring, ringDeg: cr.ringDeg, ringCol: cr.ringCol, conf: cr.pct, confColor: cr.text, range: `${lo}–${hi}`, confTitle: `Confidence ${c.confidence}%, likely ${lo}–${hi} · ${c.ev.length} evidence`, meta: c.status === 'suggested' ? '?' : (c.ev.length ? c.ev.length + ' ev' : '—'), metaColor: 'var(--muted)', op: d ? .3 : 1, select: this.pick(active ? null : {t:'choice', id:c.id}) };
    });
    const histRow = (c, h) => ({ week: wkLabel(h.wk), type: h.type, note: h.note, color: TYPE_COLOR[h.type], dot: TYPE_DOT[h.type], choiceText: c.text, select: (e) => { e.stopPropagation(); this.setState({ sel: {t:'choice', id:c.id} }); } });

    // overview
    const score = Math.round(this.overall(W) * 100); const prev = W > 1 ? Math.round(this.overall(W - 1) * 100) : null; const dlt = prev === null ? null : score - prev;
    const active = view.filter(c => c.status !== 'removed');
    const sug = view.find(c => c.status === 'suggested'); const sugFor = sug && LINKS.find(l => l[1] === sug.id); 
    const ranked = PILLARS.map(p => ({ p, ...pillarInfo(p) })).filter(x => x.has).sort((a, b) => a.avg - b.avg);
    const changes = view.flatMap(c => c.hist.filter(h => h.wk === W).map(h => histRow(c, h)));
    const ovColor = confColor(score / 100);
    const ov = { score, ring: `conic-gradient(${ovColor} ${Math.round(score * 3.6)}deg, var(--border) 0)`, ringDeg: `${Math.round(score * 3.6)}deg`, ringCol: ovColor, scoreColor: confText(score / 100), delta: dlt === null ? 'First week' : dlt === 0 ? 'No change since last week' : `${dlt > 0 ? '+' : ''}${dlt} since week ${W - 1}`, deltaColor: dlt > 0 ? 'var(--green-text)' : dlt < 0 ? 'var(--red-text)' : 'var(--muted)',
      nSup: active.filter(c => c.status === 'strengthened').length, nUnt: active.filter(c => c.status === 'guess' || c.status === 'added').length, nWeak: active.filter(c => c.status === 'weakened').length, nSug: active.filter(c => c.status === 'suggested').length,
      hasSuggestion: !!sug, suggestionText: sug ? sug.text : '', suggestionFor: sugFor && find(sugFor[0]) ? find(sugFor[0]).text : '',
      suggestions: view.filter(c => c.status === 'suggested').reverse().map(c => { const l = LINKS.find(x => x[1] === c.id); const o = l && find(l[0]); return { id: c.id, text: c.text, note: o ? `Replacement for “${o.text}” · tap to review` : `New choice under ${this.show(c.pillar)} · tap to review`, open: this.pick({t:'choice', id:c.id}) }; }), suggestionNote: sugFor && find(sugFor[0]) ? `Replacement for “${find(sugFor[0]).text}” · tap to review` : sug ? `New choice under ${sug.pillar} · tap to review` : '', openSuggestion: sug ? this.pick({t:'choice', id:sug.id}) : null,
      weakest: ranked.length ? this.show(ranked[0].p) : '—', changes, noChanges: !changes.length, changesTitle: 'Changes this week' };

    // pillar view
    let pv = null;
    if (mode === 'pillar') {
      const p = sel.id; const info = pillarInfo(p); const cs = view.filter(c => c.pillar === p); const act = cs.filter(c => c.status !== 'removed');
      const evN = cs.reduce((a, c) => a + c.ev.length, 0);
      const tests = act.filter(c => c.status !== 'strengthened' && c.test !== '—').map(c => ({ choice: c.text, text: c.test, select: this.pick({t:'choice', id:c.id}) }));
      pv = { name: this.show(p), glyph: FX[p].glyph, pct: info.pct, ring: `conic-gradient(${info.ringColor} ${Math.round(info.avg * 360)}deg, var(--border) 0)`, ringDeg: `${Math.round(info.avg * 360)}deg`, ringCol: info.ringColor, label: info.label, labelColor: info.labelColor, summary: `${act.length} active ${act.length === 1 ? 'choice' : 'choices'} · ${evN} evidence`,
        choices: cs.map(choiceRow), tests, noTests: !tests.length,
        history: cs.flatMap(c => c.hist.map(h => histRow(c, h))).sort((a, b) => parseInt(b.week.slice(3)) - parseInt(a.week.slice(3))) };
    }

    // choice view
    let cv = null;
    if (selC && mode === 'choice') {
      const c = selC; const st = STATUS[c.status]; const nFor = c.ev.filter(e => e.k === 'support').length, nAg = c.ev.length - nFor; const tot = Math.max(1, c.ev.length);
      const links = LINKS.filter(l => l[0] === c.id || l[1] === c.id).map(l => { const o = find(l[0] === c.id ? l[1] : l[0]); if (!o) return null; const s = STATUS[o.status]; return { text: o.text, note: l[2] + ' · ' + s.label, dot: s.dot, dotBorder: s.dotBorder, select: this.pick({t:'choice', id:o.id}) }; }).filter(Boolean);
      cv = { pillar: this.show(c.pillar), selectPillar: this.pick({t:'pillar', id:c.pillar}), text: c.text, statusLabel: st.label, chipBg: st.chipBg, chipFg: st.chipFg, summary: SUMMARY[c.status], since: wkLabel(c.hist[c.hist.length - 1].wk), isSuggested: c.status === 'suggested',
        nFor, nAgainst: nAg, forPct: Math.round(nFor / tot * 100), againstPct: Math.round(nAg / tot * 100), evCount: c.ev.length, noEvidence: !c.ev.length,
        evidence: c.ev.map((e, i) => ({ text: e.text, source: e.source, url: e.url, tier: e.tier, accent: e.k === 'support' ? 'var(--green)' : 'var(--red)', select: this.pick({t:'evidence', cid:c.id, idx:i}) })),
        canEdit: c.status !== 'removed' && c.status !== 'suggested', test: c.test === '—' ? 'Removed. No further tests planned.' : c.test,
        hasLinks: !!links.length, links,
        history: c.hist.slice().reverse().map(h => histRow(c, h)), canRemove: c.status !== 'removed' && c.status !== 'suggested',
        // App: pressure-test this choice. Challenge opens Discussions; Research and Plan call /api/node/*.
        canAct: c.status !== 'removed' && c.status !== 'suggested', nodeBusy: this.state.nodeBusy,
        challenge: (e) => { e.stopPropagation(); this.challenge(c); }, research: (e) => { e.stopPropagation(); this.research(c); }, plan: (e) => { e.stopPropagation(); this.plan(c); } };
    }

    // evidence view
    let ev = null;
    if (mode === 'evidence' && selC) {
      const c = selC; const e = c.ev[sel.idx] || c.ev[0]; const st = STATUS[c.status];
      const h = c.hist.find(x => x.wk === e.wk && x.type !== 'Added'); const sup = e.k === 'support';
      ev = { pillar: this.show(c.pillar), selectPillar: this.pick({t:'pillar', id:c.pillar}), selectChoice: this.pick({t:'choice', id:c.id}), text: e.text, source: e.source + ' · ' + wkLabel(e.wk), src: { url: e.url, tier: e.tier, source: e.source }, week: wkLabel(e.wk), kindLabel: sup ? 'Supports' : 'Undermines', chipBg: sup ? 'var(--green-tint)' : 'var(--red-tint)', chipFg: sup ? 'var(--green-text)' : 'var(--red-text)',
        impact: h ? `${h.type} “${c.text}” in week ${h.wk}. ${h.note}.` : `Logged in week ${e.wk}. On its own it did not change the status of “${c.text}”.`,
        choiceText: c.text, dot: st.dot, dotBorder: st.dotBorder,
        siblings: c.ev.map((s, i) => ({ s, i })).filter(x => x.i !== sel.idx).map(x => ({ text: x.s.text, accent: x.s.k === 'support' ? 'var(--green)' : 'var(--red)', select: this.pick({t:'evidence', cid:c.id, idx:x.i}) })) };
      ev.noSiblings = !ev.siblings.length;
    }

    // App: bounds of everything visible, for Fit to screen.
    { const B = { minX: CX - 60, maxX: CX + 60, minY: CY - 60, maxY: CY + 60 }; const add = (x, y, w, h) => { B.minX = Math.min(B.minX, x - w / 2); B.maxX = Math.max(B.maxX, x + w / 2); B.minY = Math.min(B.minY, y - h / 2); B.maxY = Math.max(B.maxY, y + h / 2); };
      pillars.forEach(p => add(p.x, p.y, 84, 84)); choices.forEach(c => add(c.x, c.y, 156 * c.scale, 52 * c.scale)); orbit.forEach(o => add(o.x, o.y, 176, 44)); this._bounds = B;
      const boxes = {}; const grow = (k, x, y, w, h) => { const b = boxes[k] || (boxes[k] = { minX: x, maxX: x, minY: y, maxY: y }); b.minX = Math.min(b.minX, x - w / 2); b.maxX = Math.max(b.maxX, x + w / 2); b.minY = Math.min(b.minY, y - h / 2); b.maxY = Math.max(b.maxY, y + h / 2); };
      pillars.forEach(p => grow(p.name, p.x, p.y, 84, 84)); rows.forEach(r => grow(r.c.pillar, r.x, r.y, 156, 52)); orbit.forEach(o => grow('orbit', o.x, o.y, 176, 44)); this._boxes = boxes; }
    const evTotal = view.reduce((a, c) => a + c.ev.length, 0);
    const ovOpen = this.state.widget === 'overview';

    return {
      ideaName: this.name, ideaPitch: this.pitch, ideaInitial: (this.name || '?').trim().charAt(0).toUpperCase(),
      loading: this.state.loading, missing: this.state.missing,
      paneRef: this.setPane, worldRef: this.worldRef, pctRef: this.pctRef, edges, curves, pillars, choices, orbit, evCard, researchView: this.researchView, particles, flows,
      zoomIn: (e) => { e.stopPropagation(); this.zoomStep(1.25); }, zoomOut: (e) => { e.stopPropagation(); this.zoomStep(1 / 1.25); },
      zoomFit: (e) => { e.stopPropagation(); this.fit(); },
      counts: `${active.length} choices · ${evTotal} evidence`, nChoices: active.length, nEvidence: evTotal,
      showHint: !expanded.length,
      toggleAllLabel: expanded.length === PILLARS.length ? 'Collapse' : 'Expand all',
      toggleAll: (e) => { e.stopPropagation(); this.setState(s => ({ expanded: s.expanded.length === PILLARS.length ? [] : [...PILLARS], sel: s.expanded.length === PILLARS.length ? null : s.sel }), () => this.fit()); },
      ideaShadow: mode === 'idea' && sel ? '0 0 0 6px var(--focus-ring), 0 12px 32px var(--shadow)' : '0 0 0 10px color-mix(in srgb, var(--accent) 10%, transparent), 0 12px 32px var(--shadow)',
      hoverIdea: this.state.hoverIdea, hoverOn: () => this.setState({ hoverIdea: true }), hoverOff: () => this.setState({ hoverIdea: false }),
      isIdea: ovOpen && mode === 'idea', isPillar: ovOpen && mode === 'pillar', isChoice: ovOpen && mode === 'choice', isEvidence: ovOpen && mode === 'evidence',
      // App: widgets. The rail switches what the sidebar shows; widgets feed the tree through applyWidget().
      widget: this.state.widget, panelOpen: this.state.panelOpen, panelW: this.state.panelW, occupied: this.occupied(),
      setWidget: (w) => this.setState(s => s.widget === w && s.panelOpen ? { panelOpen: false } : { widget: w, panelOpen: true }),
      closePanel: () => this.setState({ panelOpen: false }),
      setPanelW: (w) => { const v = Math.round(Math.min(PANEL_MAX, Math.max(PANEL_MIN, w))); this._dragW = 0; try { localStorage.setItem('sprout.panelW', String(v)); } catch {} this.setState({ panelW: v }); },
      setDragW: (w) => { this._dragW = w; },
      showBadge: !!sug && !(ovOpen && this.state.panelOpen),
      ideaId: this.ideaId, wmem: this.state.wmem,
      // Widget memory rides along in the stored idea (StoredIdea.widgets), so it follows the founder across devices.
      setWmem: (key, patch) => { if (!this.idea) return; const widgets = { ...(this.idea.widgets || {}), [key]: { ...((this.idea.widgets || {})[key] || {}), ...patch } }; this.idea = { ...this.idea, widgets }; this.setState({ wmem: widgets }); ideaStore().save(this.idea).catch(err => console.error('[map] save widgets', err)); },
      // App: the rail's Launch day button is Open House on a nonprofit.
      draftHint: this.idea?.mode === 'nonprofit' ? 'Add what you learned… e.g. 7 of 10 families came back in week two' : 'Add what you learned… e.g. 7 of 10 testers finished setup',
      railLabels: this.idea?.mode === 'nonprofit' ? { launch: profileFor('nonprofit').launch.title } : {},
      pillarPct: Object.fromEntries(pillars.map(p => [p.name, p.pct])), showPillar: (key) => this.show(LABEL[key] ?? key),
      buildIdea: () => this.idea,
      team: this.team, saveTeam: (team) => this.saveTeam(team),
      focus: this.state.discuss,
      applyWidget: (updates, sourceLabel, toast) => this.applyWidget(updates, sourceLabel, toast),
      openOverview: () => this.setState({ widget: 'overview', sel: null, panelOpen: true }),
      ov, pv, cv, ev,
      hasToast: !!this.state.toast, toast: this.state.toast,
      canUndo: this.canUndo(), undoLabel: this.canUndo() ? this._undo.label : '', undo: (e) => { if (e) e.stopPropagation(); this.undoLast(); },
      draft: this.state.draft, setDraft: (e) => this.setState({ draft: e.target.value }),
      clearSel: () => { if (this._suppressClick) { this._suppressClick = false; return; } this.setState({ sel: null, pinEv: null }); }, selIdea: this.pick({t:'idea'}),
      addFor: (e) => this.addEvidence(e, 'support'), addAgainst: (e) => this.addEvidence(e, 'against'),
      removeChoice: (e) => { e.stopPropagation(); const c = selC; if (!c) return; const prev = this.idea; const stamped = [{ action: 'kill', choiceId: c.id, reason: 'Removed by founder', source: 'plan', at: Date.now() }]; const next = applyUpdates(prev, stamped); this._undo = { prev, next, stamped, label: 'Removed by you', at: Date.now() }; this.persist(next, { sel: {t:'pillar', id:c.pillar} }); this.say(`“${c.text}” removed · ${this.show(c.pillar)} recalculated`, 7000); },
      // App: accept / reject work on whichever suggestion is open. adopt() kills the pivot parent; reject() drops the suggestion. Both write history.
      accept: (e) => { e.stopPropagation(); const c = selC; if (!c) return; const l = LINKS.find(x => x[1] === c.id); const old = l ? find(l[0]) : null; this.persist(adopt(this.idea, c.id), { sel: {t:'choice', id:c.id} }, old ? `Replacement accepted · “${old.text}” retired` : `“${c.text}” accepted`); },
      reject: (e) => { e.stopPropagation(); const c = selC; if (!c) return; const l = LINKS.find(x => x[1] === c.id); const old = l ? find(l[0]) : null; this.persist(rejectChoice(this.idea, c.id), { sel: old ? {t:'choice', id:old.id} : null }, old ? `Suggestion rejected · “${old.text}” stays ${STATUS[old.status].label.toLowerCase()}` : 'Suggestion rejected'); },
    };
  }
  // App: the team card. Saved to the account; the map is re-derived so later feasibility checks see it.
  async saveTeam(team) {
    await ideaStore().saveTeam(team);
    this.team = team;
    if (this.idea) this.setState(this.derive(this.idea));
  }
  // App: open Discussions with the persona this pillar calls for, focused on the choice.
  challenge(c) {
    const role = ROLE_FOR_PILLAR[c.pillarKey] || 'customer';
    this.setState({ widget: 'customer', panelOpen: true, discuss: { role, choiceId: c.id, label: c.text, key: Date.now() } });
  }
  // App: web evidence for or against one choice, landed through the same path as every widget.
  research(c) {
    if (this.state.nodeBusy) return;
    this.setState({ nodeBusy: 'research' });
    researchChoice(this.idea, c.id, this.team)
      .then(updates => { if (!updates.length) { this.say(`No clear evidence found for “${c.text}”`); return; } this.applyWidget(updates, 'Research'); })
      .catch(err => this.say(err.message))
      .finally(() => this.setState({ nodeBusy: null }));
  }
  // App: 3-5 next steps for one choice, stored as its plan; the first undone step becomes "Next test".
  plan(c) {
    if (this.state.nodeBusy) return;
    this.setState({ nodeBusy: 'plan' });
    planChoice(this.idea, c.id, this.team)
      .then(steps => {
        if (!steps.length) { this.say('No plan came back. Try again.'); return; }
        const next = { ...this.idea, choices: this.idea.choices.map(x => x.id === c.id ? { ...x, plan: { steps, done: steps.map(() => false) } } : x) };
        this.persist(next, null, `Plan for “${c.text}” · next test: ${steps[0]}`);
      })
      .catch(err => this.say(err.message))
      .finally(() => this.setState({ nodeBusy: null }));
  }
  addEvidence(e, k) {
    e.stopPropagation(); const text = this.state.draft.trim(); if (!text) { this.say('Write what you learned first'); return; }
    const id = this.state.sel.id; const c = this.state.choices.find(x => x.id === id); const type = k === 'support' ? 'Strengthened' : 'Weakened';
    // App: same path as every widget result.
    this.setState({ draft: '' });
    this.applyWidget([{ action: k === 'support' ? 'strengthen' : 'weaken', choiceId: id, delta: k === 'support' ? 5 : -5, reason: k === 'support' ? 'New supporting evidence' : 'New evidence against', evidence: [{ type: 'quote', text, origin: 'Added by you', tier: 'real' }], source: 'plan' }],
      'Added by you', `${type} “${c.text}” · ${this.show(c.pillar)} recalculated`);
  }
  // App: apply TreeUpdates from a widget (or the founder) to the stored Idea, save, and re-derive the map.
  // Opens the affected pillars and pulses them. Returns what changed, for "What this changed" lists.
  applyWidget(updates, sourceLabel, toast) {
    if (!this.idea) return [];
    const at = Date.now();
    const stamped = updates.map(u => ({ ...u, at: u.at || at, source: u.source || 'plan' }));
    const prev = this.idea;
    const next = applyUpdates(prev, stamped);
    const described = describeUpdates(prev, next, stamped);
    // Shown labels ("Funding" on a nonprofit) for toasts and "what this changed"; the map's internal
    // labels ("Revenue") for opening, pulsing and revealing pillars, which are keyed by them.
    const changes = described.map(ch => ({ ...ch, pillar: this.show(LABEL[ch.pillar]) }));
    if (!changes.length) return changes;
    const pillarsHit = [...new Set(described.map(ch => LABEL[ch.pillar]))];
    const top = changes[0];
    this.persist(next, { expanded: [...new Set([...this.state.expanded, ...pillarsHit])], flash: { pillars: pillarsHit, text: top.type, key: Date.now() } });
    this.reveal(pillarsHit);
    clearTimeout(this._flashT); this._flashT = setTimeout(() => this.setState({ flash: null }), 1800);
    // One-deep undo: this batch replaces whatever was undoable before. The toast stays up longer while it can be undone.
    this._undo = { prev, next, stamped, label: sourceLabel, at };
    if (toast !== false) this.say(toast || `${top.type} “${top.choiceText}” · ${top.pillar} recalculated`, 7000);
    this.emitFx(prev, next, stamped, described, sourceLabel);
    return changes;
  }
  // ---- undo (one deep) ----
  // Reverts the tree to the idea as it was before the last batch (applyWidget or Remove), saves it, and shows
  // the change going back on the map. Only the tree is restored: widget memory (Launch's "sent" marks) and
  // the widgets' own "What this changed" lists are not touched.
  canUndo() { return !!this._undo && this.idea === this._undo.next; }
  undoLast() {
    if (!this.canUndo()) return;
    const { prev, next, stamped, label } = this._undo;
    this._undo = null;
    this.persist(prev, { sel: null }, `Undid ${label}`);
    // Reverse FX: each update's opposite, so the dots fly the change back to where it came from.
    const reversed = stamped.map(u => {
      const at = Date.now();
      if (u.action === 'strengthen') return { action: 'weaken', choiceId: u.choiceId, delta: -Math.abs(u.delta ?? 5), reason: `Undo: ${u.reason}`, source: u.source, at };
      if (u.action === 'weaken' || u.action === 'haunt') return { action: 'strengthen', choiceId: u.choiceId, delta: Math.abs(u.delta ?? (u.action === 'haunt' ? 10 : 5)), reason: `Undo: ${u.reason}`, source: u.source, at };
      if (u.action === 'add' && u.newChoice) {
        const nc = u.newChoice, added = next.choices.find(c => c.pillar === nc.pillar && c.status !== 'killed' && c.label.trim().toLowerCase() === nc.label.trim().toLowerCase() && !prev.choices.some(pc => pc.id === c.id));
        return added ? { action: 'kill', choiceId: added.id, reason: `Undo: ${u.reason}`, source: u.source, at } : null;
      }
      if (u.action === 'kill') return { action: 'strengthen', choiceId: u.choiceId, delta: 0, reason: `Undo: ${u.reason}`, source: u.source, at };
      return null;
    }).filter(Boolean);
    const described = describeUpdates(next, prev, reversed);
    if (described.length) this.emitFx(next, prev, reversed, described, `Undo · ${label}`);
    else {
      try { emitFx({ key: Date.now() + Math.random(), at: Date.now(), sourceLabel: `Undo · ${label}`, source: 'plan', sourceWidget: null, changes: [], overallBefore: 0, overallAfter: 0 }); } catch {}
    }
  }
  // FX (visual only): one event per batch with before/after numbers for the overlay in ./fx. Never throws into the caller.
  emitFx(prev, next, stamped, described, sourceLabel) {
    try {
      const pct = arr => arr.map(v => Math.round(v * 100));
      const pb = pct(pillarScores(prev)), pa = pct(pillarScores(next));
      const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
      const byIdPrev = Object.fromEntries(prev.choices.map(c => [c.id, c])), byIdNext = Object.fromEntries(next.choices.map(c => [c.id, c]));
      const changes = described.map((ch, i) => {
        const u = stamped.find(x => (x.choiceId && x.choiceId === ch.choiceId) || (x.action === 'add' && x.newChoice && x.newChoice.label.trim().toLowerCase() === ch.choiceText.trim().toLowerCase())) || stamped[i] || stamped[0];
        const b = byIdPrev[ch.choiceId], a = byIdNext[ch.choiceId];
        const k = PILLAR_KEYS.indexOf(ch.pillar);
        return { type: ch.type, action: u ? u.action : 'strengthen', choiceId: ch.choiceId, choiceText: ch.choiceText, pillar: ch.pillar, pillarLabel: this.show(LABEL[ch.pillar]), reason: ch.reason,
          confBefore: b ? b.confidence : (a ? a.confidence : 0), confAfter: a ? a.confidence : (b ? b.confidence : 0),
          evidenceAdded: Math.max(0, (a ? a.evidence.length : 0) - (b ? b.evidence.length : 0)),
          pillarBefore: k >= 0 ? pb[k] : 0, pillarAfter: k >= 0 ? pa[k] : 0, ghost: u && u.action === 'haunt' ? (u.ghost || undefined) : undefined };
      });
      const source = (stamped[0] && stamped[0].source) || 'plan';
      emitFx({ key: Date.now() + Math.random(), at: Date.now(), sourceLabel, source, sourceWidget: WIDGET_FOR_SOURCE[source] ?? null, changes, overallBefore: avg(pb), overallAfter: avg(pa) });
    } catch (err) { console.warn('[map] fx', err); }
  }
}

export default Component;
