// Logic for the IdeaMap screen, from the Claude Design file "Idea Map.dc.html".
// Changes from the design: page links point at app routes, keyframe names carry the "im-" prefix,
// colors come from the Sprout theme variables (globals.css), the map can show any saved idea
// (/map?id=…, Pantry when there is none), and edits are saved per idea so leaving doesn't lose them.
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
import { getIdea, loadMapState, saveMapState } from "@/ideas/store";
import { ideaToMap } from "@/ideas/toMap";
import { applyUpdates } from "@/ideas/applyUpdates";
import { mapToIdea } from "@/ideas/toIdea";
import { Camera, MIN_ZOOM, MAX_ZOOM } from "./camera";
const PILLARS = ['Customer','Problem','Solution','Approach','Edge','Reach','Revenue','Risks'];
const NOW = 6;
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
const RESOURCES0 = [
  {id:'ios', name:'2 iOS engineers', have:true},
  {id:'nutri', name:'Nutrition intern', have:true},
  {id:'cash', name:'$40k runway', have:true},
  {id:'recipes', name:'Recipe DB license', have:false},
  {id:'ambass', name:'Campus ambassadors', have:false},
];
const CHOICES0 = [
  {id:'c1', pillar:'Customer', text:'Target college students', res:[], test:'Run 10 more interviews at a second campus to check this isn’t one school’s culture.', ev:[
    {k:'support', wk:2, text:'27 of 30 interviewees cook ≥3 nights/week on a budget', source:'Interviews, wk 2'},
    {k:'support', wk:2, text:'Dorm meal plans average $2,400/semester', source:'NACUFS 2025'},
    {k:'support', wk:2, text:'“I’d pay for anything that stops the 11pm DoorDash”', source:'Interview #14'}],
    hist:[{wk:1, type:'Added', note:'Initial hypothesis'},{wk:2, type:'Strengthened', note:'Interview round 1 confirmed budget pressure'}]},
  {id:'c2', pillar:'Customer', text:'Focus on off-campus renters', res:[], test:'Split the waitlist by housing type and compare activation after the first plan.', ev:[], hist:[{wk:4, type:'Added', note:'Emerged from dorm-kitchen access problem'}]},
  {id:'c3', pillar:'Problem', text:'Overspend on takeout', res:[], test:'Ask 20 students to share a month of bank statements; confirm the $200+ median.', ev:[
    {k:'support', wk:3, text:'Median takeout spend $212/month in survey', source:'Survey n=118, wk 3'},
    {k:'support', wk:3, text:'“I know it’s bad, I just don’t have a plan by 6pm”', source:'Interview #7'}],
    hist:[{wk:1, type:'Added', note:'Initial hypothesis'},{wk:3, type:'Strengthened', note:'Survey data matched interview claims'}]},
  {id:'c4', pillar:'Problem', text:'Don’t know how to cook', res:[], test:'Watch 5 students cook a 3-step recipe unassisted. If 4+ finish, drop this.', ev:[
    {k:'against', wk:2, text:'22 of 30 rated themselves “can follow a recipe”', source:'Interviews, wk 2'},
    {k:'support', wk:5, text:'Top search in-app prototype: “how long to boil pasta”', source:'Prototype logs'}],
    hist:[{wk:1, type:'Added', note:'Initial hypothesis'},{wk:2, type:'Weakened', note:'Skill is not the blocker; planning is'}]},
  {id:'c5', pillar:'Solution', text:'Plan from a pantry photo', res:['ios','recipes'], test:'Ship photo-to-plan to 30 waitlist users; measure plans completed per week.', ev:[
    {k:'support', wk:5, text:'Prototype: 9 of 12 completed first plan in <4 min', source:'Usability test, wk 5'}],
    hist:[{wk:3, type:'Added', note:'Replaced manual ingredient entry'}]},
  {id:'c6', pillar:'Solution', text:'Grocery list synced to store', res:['ios'], test:'Fake-door the sync button; count taps before building the integration.', ev:[
    {k:'support', wk:5, text:'8 of 12 testers asked for it unprompted', source:'Usability test, wk 5'}],
    hist:[{wk:5, type:'Added', note:'Requested repeatedly in usability sessions'}]},
  {id:'c7', pillar:'Approach', text:'Mobile-first, iOS first', res:['ios'], test:'Check Android share on the waitlist; revisit if it passes 40%.', ev:[
    {k:'support', wk:3, text:'71% of survey respondents on iPhone', source:'Survey n=118'}],
    hist:[{wk:1, type:'Added', note:'Matches team skills'},{wk:3, type:'Strengthened', note:'Device split from survey'}]},
  {id:'c8', pillar:'Edge', text:'Recipes tuned to dorm kitchens', res:['nutri','recipes'], test:'Publish 10 hot-plate recipes; compare saves vs. standard recipes.', ev:[], hist:[{wk:2, type:'Added', note:'Hot plate + microwave constraint'}]},
  {id:'c9', pillar:'Edge', text:'Partner with campus dining', res:[], test:'—', ev:[
    {k:'against', wk:4, text:'3 of 3 dining directors said procurement cycle is 18+ months', source:'Calls, wk 4'}],
    hist:[{wk:1, type:'Added', note:'Initial hypothesis'},{wk:4, type:'Removed', note:'Sales cycle incompatible with runway'}]},
  {id:'c10', pillar:'Reach', text:'Campus ambassador program', res:['ambass','cash'], test:'Recruit 3 ambassadors at one campus; target 50 signups each in 2 weeks.', ev:[], hist:[{wk:2, type:'Added', note:'Borrowed from fintech playbooks'}]},
  {id:'c11', pillar:'Reach', text:'Short-form recipe videos', res:['nutri'], test:'Post daily for 2 more weeks; does waitlist CAC stay under $1?', ev:[
    {k:'support', wk:6, text:'Test account: 40k views, 310 waitlist signups in 10 days', source:'TikTok, wk 5–6'}],
    hist:[{wk:5, type:'Added', note:'Ambassador program slow to start; tried content'}]},
  {id:'c12', pillar:'Revenue', text:'Charge $8/month', res:[], test:'Put a real checkout at $8 in front of 100 waitlist users; measure conversion.', ev:[
    {k:'against', wk:6, text:'12 of 15 balked at $8; $4–5 was the common ceiling', source:'Pricing interviews, wk 6'},
    {k:'support', wk:6, text:'3 of 15 said “cheaper than one takeout order”', source:'Pricing interviews, wk 6'}],
    hist:[{wk:1, type:'Added', note:'Initial hypothesis'},{wk:6, type:'Weakened', note:'Price sensitivity higher than expected'}]},
  {id:'c13', pillar:'Revenue', text:'$4/month or $29/year', res:[], test:'A/B a $4 vs $8 checkout page on the waitlist.', ev:[
    {k:'support', wk:6, text:'Derived from the $4–5 ceiling in pricing interviews', source:'Pricing interviews, wk 6'}],
    hist:[{wk:6, type:'Suggested', note:'Possible replacement for $8/month'}]},
  {id:'c14', pillar:'Risks', text:'Students churn over summer', res:[], test:'Design a summer mode (home kitchen recipes) and pre-test interest in May.', ev:[
    {k:'support', wk:4, text:'Comparable student apps lose 40–60% MAU June–Aug', source:'Public metrics, 3 apps'}],
    hist:[{wk:1, type:'Added', note:'Initial hypothesis'},{wk:4, type:'Strengthened', note:'Seasonality confirmed in comps'}]},
];
const LINKS = [['c12','c13','Proposed replacement'],['c10','c11','Alternative channel'],['c4','c5','Shapes onboarding']];
const SCORE = {strengthened:1, added:.6, guess:.4, weakened:.2, removed:0};
const STATUS = {
  strengthened:{label:'Strengthened', dot:'var(--green)', dotBorder:'transparent', border:'var(--border)', bg:'var(--surface)', color:'var(--text)', style:'solid', chipBg:'var(--green-tint)', chipFg:'var(--green-text)'},
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
const confColor = v => v >= .75 ? 'var(--green)' : v >= .45 ? 'var(--amber)' : 'var(--red)';
// Small text in a signal color uses the darker -text shades so it stays readable.
const confText = v => v >= .75 ? 'var(--green-text)' : v >= .45 ? 'var(--amber-text)' : 'var(--red-text)';
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

const PANTRY = { name: 'Pantry', pitch: 'A $8/month meal-planning app for college students on tight budgets.', now: NOW, choices: CHOICES0, resources: RESOURCES0, links: LINKS };
const urlId = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('id'));

class Component extends DCLogic {
  constructor(p) {
    super(p);
    this.state = { sel:null, hoverIdea:false, hover:null, draft:'', toast:null, expanded:[], replaying:false, ...this.load(urlId()) };
  }
  // App: which idea this map shows. A saved idea comes from the store (src/ideas); anything else is Pantry.
  load(id) {
    const saved = id && typeof window !== 'undefined' ? getIdea(id) : null;
    const data = saved ? ideaToMap(saved.idea, saved.name) : PANTRY;
    this.ideaId = saved ? saved.id : 'pantry';
    this.now = data.now; this.name = data.name; this.pitch = data.pitch; this.base = saved ? saved.idea : null;
    const edits = typeof window !== 'undefined' ? loadMapState(this.ideaId) : null;
    const choices = edits && Array.isArray(edits.choices) ? edits.choices : data.choices.map(c => ({...c, ev:[...c.ev], hist:[...c.hist]}));
    const resources = edits && Array.isArray(edits.resources) ? edits.resources : data.resources.map(r => ({...r}));
    // Links are state now (widgets add suggestions that replace a choice). wmem: per-widget memory, e.g. graves haunted / learned.
    const links = edits && Array.isArray(edits.links) ? edits.links : data.links.map(l => [...l]);
    const wmem = edits && edits.wmem && typeof edits.wmem === 'object' ? edits.wmem : {};
    this._saved = { choices, resources, links, wmem };
    return { choices, resources, links, wmem, week: this.now, sel: null, expanded: [], widget: 'overview', flash: null };
  }
  // App: save the founder's edits after every update that changed them.
  setState(update, cb) {
    super.setState(update, () => {
      const { choices, resources, links, wmem } = this.state; const o = this._saved;
      if (choices !== o.choices || resources !== o.resources || links !== o.links || wmem !== o.wmem) { this._saved = { choices, resources, links, wmem }; saveMapState(this.ideaId, { choices, resources, links, wmem }); }
      if (cb) cb();
    });
  }
  componentDidMount() {
    // App: Next keeps this page alive (hidden) between visits, so a different ?id= means a different idea.
    const id = urlId(); const target = id && getIdea(id) ? id : 'pantry';
    if (target !== this.ideaId) { clearInterval(this._replay); this._fitted = false; this.setState({ ...this.load(id), replaying: false }, () => this.fit(false)); }
    this._key = (e) => {
      if (e.target && /TEXTAREA|INPUT/.test(e.target.tagName)) return;
      if (e.key === 'Escape') this.setState({sel:null});
      if (e.key === '+' || e.key === '=') this.zoomStep(1.25);
      if (e.key === '-') this.zoomStep(1 / 1.25);
      if (e.key === '0') this.fit();
      if (e.key === 'ArrowLeft') this.setState(s => ({week: Math.max(1, s.week - 1)}));
      if (e.key === 'ArrowRight') this.setState(s => ({week: Math.min(this.now, s.week + 1)}));
    };
    window.addEventListener('keydown', this._key);
  }
  componentWillUnmount() { window.removeEventListener('keydown', this._key); clearInterval(this._replay); clearTimeout(this._toastT); clearTimeout(this._flashT); }

  // ---- App: pan and zoom (camera.ts). Nothing here calls setState. ----
  worldRef = React.createRef();
  pctRef = React.createRef();
  camera = new Camera(v => this.applyView(v));
  applyView({ x, y, k }) {
    const w = this.worldRef.current, pane = this._pane;
    if (w) {
      w.style.transform = `translate3d(${x}px,${y}px,0) scale(${k})`;
      // will-change only while moving: it keeps frames cheap, and dropping it afterwards lets text re-rasterize crisply.
      w.style.willChange = 'transform'; clearTimeout(this._settle); this._settle = setTimeout(() => { if (this.worldRef.current) this.worldRef.current.style.willChange = 'auto'; }, 160);
    }
    if (pane) { let g = 24 * k; while (g < 12) g *= 2; pane.style.backgroundSize = `${g}px ${g}px`; pane.style.backgroundPosition = `${x}px ${y}px`; }
    if (this.pctRef.current) this.pctRef.current.textContent = Math.round(k * 100) + '%';
  }
  // Frame every visible node. Bounds come from the last render (renderVals stores them).
  fitView() {
    const pane = this._pane, b = this._bounds; if (!pane || !b || !pane.clientWidth) return null;
    const top = 64, bottom = 76, side = 40; // clear the zoom controls and the week bar
    const vw = pane.clientWidth - side * 2, vh = pane.clientHeight - top - bottom;
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
    const off = [...keys, 'orbit'].map(key => boxes[key]).filter(Boolean).some(b => b.minX * k + x < m || b.maxX * k + x > pane.clientWidth - m || b.minY * k + y < 56 || b.maxY * k + y > pane.clientHeight - 72);
    if (off) this.fit();
  }
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
  say(msg) { clearTimeout(this._toastT); this.setState({toast: msg}); this._toastT = setTimeout(() => this.setState({toast:null}), 2600); }
  pick(sel) { return (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.setState(s => { let expanded = s.expanded; const cid = sel && (sel.t === 'choice' ? sel.id : sel.t === 'evidence' ? sel.cid : null); if (cid) { const c = s.choices.find(x => x.id === cid); if (c && !expanded.includes(c.pillar)) expanded = [...expanded, c.pillar]; } if (sel && sel.t === 'pillar' && !expanded.includes(sel.id)) expanded = [...expanded, sel.id]; if (sel && sel.t === 'resource') { const ps = s.choices.filter(c => c.res.includes(sel.id)).map(c => c.pillar); expanded = [...new Set([...expanded, ...ps])]; } return { sel, draft:'', expanded, widget: 'overview' }; }, () => this.reveal(this.state.expanded)); }; }
  hoverOn(k) { return () => { if (!this._dragging) this.setState({ hover: k }); }; }
  hoverOff(k) { return () => this.setState(s => s.hover === k ? { hover: null } : null); }
  togglePillar(p) { return (e) => { e.stopPropagation(); this.setState(s => { const open = s.expanded.includes(p); const selected = s.sel && s.sel.t === 'pillar' && s.sel.id === p; if (open && selected) return { expanded: s.expanded.filter(x => x !== p), sel: null }; return { expanded: open ? s.expanded : [...s.expanded, p], sel: {t:'pillar', id:p}, draft:'', widget: 'overview' }; }, () => this.reveal([p])); }; }
  pillarScore(W, p) {
    const cs = this.state.choices.map(c => ({c, st: statusAt(c, W)})).filter(x => x.c.pillar === p && x.st && x.st !== 'suggested' && x.st !== 'removed');
    return cs.length ? cs.reduce((a, x) => a + SCORE[x.st], 0) / cs.length : null;
  }
  overall(W) { const s = PILLARS.map(p => this.pillarScore(W, p)).filter(x => x !== null); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0; }

  renderVals() {
    const showRemoved = this.props.showRemoved ?? true;
    const dim = this.props.dimUnrelated ?? true;
    const { sel, week: W, choices: allC, resources: RES } = this.state;
    const NOW = this.now, LINKS = this.state.links;
    const isPast = W < NOW;
    const view = allC.map(c => ({ ...c, status: statusAt(c, W), ev: c.ev.filter(e => e.wk <= W), hist: c.hist.filter(h => h.wk <= W) })).filter(c => c.status && (showRemoved || c.status !== 'removed'));
    const byId = Object.fromEntries(view.map(c => [c.id, c]));
    const find = id => byId[id];

    const mode = !sel ? 'idea' : sel.t;
    const selC = (mode === 'choice' && find(sel.id)) || (mode === 'evidence' && find(sel.cid)) || null;
    const selPillar = mode === 'pillar' ? sel.id : selC ? selC.pillar : null;
    const selRes = mode === 'resource' ? RES.find(r => r.id === sel.id) : null;
    const related = new Set();
    if (selC) { related.add(selC.id); LINKS.forEach(([a, b]) => { if (a === selC.id) related.add(b); if (b === selC.id) related.add(a); }); }
    if (mode === 'pillar') view.filter(c => c.pillar === sel.id).forEach(c => related.add(c.id));
    if (selRes) view.filter(c => c.res.includes(selRes.id)).forEach(c => related.add(c.id));
    const focused = mode !== 'idea';
    const isDim = id => dim && focused && !related.has(id);

    const H = this.state.hover; const hov = (key, base) => !H || !H.startsWith('p:') ? base : H === key ? base * 1.1 : base * .8;
    const pillarAng = {}; PILLARS.forEach((p, i) => pillarAng[p] = i * 45);
    const pillarActive0 = p => selPillar === p || (selRes && view.some(c => c.pillar === p && c.res.includes(selRes.id)));
    const pR = p => (focused && !pillarActive0(p)) ? R1 * .66 : R1;
    const pPos = p => pol(pR(p), pillarAng[p]);
    const rows = [];
    const expanded = this.state.expanded;
    // App: each choice wants to sit near its pillar's angle (24° apart, as designed); spread() then pushes
    // neighbours apart until no two pills overlap, growing the ring if they can't all fit.
    PILLARS.forEach(p => { if (!expanded.includes(p)) return; const collapsed = focused && !pillarActive0(p); const cs = view.filter(c => c.pillar === p); cs.forEach((c, j) => { rows.push({ c, j, collapsed, want: pillarAng[p] + (j - (cs.length - 1) / 2) * 24 }); }); });
    const ringR = spread(rows.filter(r => !r.collapsed), R2, 1);
    const ringC = spread(rows.filter(r => r.collapsed), R2 * .66, .62);
    rows.forEach(r => { const [x, y] = pol(r.collapsed ? ringC : ringR, r.ang); r.x = x; r.y = y; });
    const R3x = Math.max(R3, ringR + 175);
    const rowOf = id => rows.find(r => r.c.id === id);

    const edges = [], curves = [];
    const pillarActive = pillarActive0;
    PILLARS.forEach(p => { const d = dim && focused && !pillarActive(p); edges.push(seg([CX, CY], pPos(p), { id: 'pe:' + p, stroke: 'var(--border)', w: 1.5, dash: false, op: 1 })); });
    rows.forEach(({ c, x, y, collapsed }) => { const d = isDim(c.id); edges.push(seg(pPos(c.pillar), [x, y], { id: 'ce:' + c.id, stroke: c.status === 'removed' ? 'var(--border)' : c.status === 'weakened' ? 'var(--red-line)' : 'var(--border)', w: 1.25, dash: c.status === 'suggested', op: collapsed ? .7 : d ? .4 : .7 })); });
    LINKS.forEach(([a, b]) => { const ra = rowOf(a), rb = rowOf(b); if (!ra || !rb) return; const hi = selC && (selC.id === a || selC.id === b); const m = pol(ringR + 70, (ra.ang + rb.ang) / 2); curves.push({ d: `M${ra.x} ${ra.y} Q${m[0]} ${m[1]} ${rb.x} ${rb.y}`, stroke: 'var(--muted)', w: 1.25, dash: '3 3', op: hi ? .9 : .4 }); });

    const orbit = []; const seen = {}; const uniq = k => (seen[k] = (seen[k] || 0) + 1) > 1 ? k + '#' + seen[k] : k;
    const evItem = (c, e, i) => ({ text: e.text, kind: e.k === 'support' ? 'for' : 'against', accent: e.k === 'support' ? 'var(--green)' : 'var(--red)', kindColor: e.k === 'support' ? 'var(--green-text)' : 'var(--red-text)', key: c.id + ':' + i, select: this.pick({t:'evidence', cid:c.id, idx:i}) });
    const resItem = (r) => ({ text: r.name, kind: r.have ? 'have' : 'missing', accent: r.have ? 'var(--muted)' : 'var(--red)', kindColor: r.have ? 'var(--muted)' : 'var(--red-text)', key: 'r:' + r.id, select: this.pick({t:'resource', id:r.id}) });
    const fan = (items, cx, cy, ang, step) => items.forEach((it, i) => { const a = ang + (i - (items.length - 1) / 2) * step; const [x, y] = pol(R3x, a); const active = (mode === 'evidence' && it.key === sel.cid + ':' + sel.idx) || (mode === 'resource' && it.key === 'r:' + sel.id); const oid = uniq('o:' + it.key); orbit.push({ ...it, id: oid, x, y, delay: (i * .06) + 's', scale: 1, enter: null, leave: null, border: active ? 'var(--accent)' : 'var(--border)', shadow: active ? ACTIVE_SHADOW : '0 2px 8px var(--shadow)' }); edges.push(seg([cx, cy], [x, y], { id: 'f' + oid, stroke: active ? 'var(--accent)' : 'var(--border)', w: 1.25, dash: it.key.startsWith('r:'), op: .85 })); });
    if (selC) { const r = rowOf(selC.id); if (r) fan([...selC.ev.map((e, i) => evItem(selC, e, i)), ...selC.res.map(id => resItem(RES.find(x => x.id === id)))], r.x, r.y, r.ang, 15); }
    if (mode === 'pillar') { view.filter(c => c.pillar === sel.id).forEach(c => { const r = rowOf(c.id); const items = [...c.ev.map((e, i) => evItem(c, e, i)), ...c.res.map(id => resItem(RES.find(x => x.id === id)))].slice(0, 4); fan(items, r.x, r.y, r.ang, 12); }); }
    if (selRes) { const users = view.filter(c => c.res.includes(selRes.id)); if (users.length) { const angs = users.map(c => rowOf(c.id).ang); const mean = angs.reduce((a, b) => a + b, 0) / angs.length; const [x, y] = pol(R3x, mean); orbit.push({ ...resItem(selRes), id: 'o:res', x, y, delay: '0s', scale: 1, enter: null, leave: null, border: 'var(--accent)', shadow: ACTIVE_SHADOW }); users.forEach(c => { const r = rowOf(c.id); edges.push(seg([r.x, r.y], [x, y], { id: 'ue:' + c.id, stroke: 'var(--accent)', w: 1.25, dash: true, op: .8 })); }); } }

        const particles = [], flows = [];
    PILLARS.forEach((p, i) => {
      if (dim && focused && !pillarActive(p)) return;
      const fx = FX[p]; const a = pol(58, pillarAng[p]), b = pol(pR(p) - 40, pillarAng[p]);
      const path = `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      fx.sizes.forEach((size, j) => particles.push({ path, glyph: fx.glyph, size, dur: fx.dur, delay: `${(-(j * parseFloat(fx.dur) / fx.sizes.length) - i * .37).toFixed(2)}s`, inner: fx.inner }));
    });

    const pillarInfo = p => { const avg = this.pillarScore(W, p); const v = avg ?? 0; return { avg: v, has: avg !== null, pct: Math.round(v * 100), label: avg === null ? 'Empty' : v >= .75 ? 'Strong' : v >= .45 ? 'Mixed' : 'Weak', labelColor: confText(v), ringColor: confColor(v) }; };
    const pillars = PILLARS.map(p => {
      const info = pillarInfo(p); const active = pillarActive(p); const [x, y] = pPos(p); const shrunk = focused && !active; const hk = 'p:' + p;
      const nC = view.filter(c => c.pillar === p && c.status !== 'removed').length; const open = expanded.includes(p); const i = PILLARS.indexOf(p);
      const fl = this.state.flash && this.state.flash.pillars.includes(p) ? this.state.flash : null;
      return { flashing: !!fl, flashText: fl ? fl.text : '', flashKey: fl ? fl.key : 0, name: p, x, y, glyph: FX[p].glyph, delay: (i * .05) + 's', rowDelay: (i * .04) + 's', badge: open ? '–' : nC, badgeBg: open ? 'var(--accent)' : 'var(--surface)', badgeBorder: open ? 'var(--surface)' : 'var(--border)', badgeFg: open ? 'var(--on-accent)' : 'var(--text)', badgeDelay: (.3 + i * .05) + 's', ring: `conic-gradient(${info.ringColor} ${Math.round(info.avg * 360)}deg, var(--border) 0)`, title: `${info.label} · ${info.pct}%`, shadow: active ? '0 0 0 4px var(--focus-ring)' : '0 1px 2px var(--shadow)', pct: info.pct, label: info.label, labelColor: info.labelColor, op: shrunk ? .85 : 1, scale: hov(hk, shrunk ? .66 : 1), select: this.togglePillar(p), enter: this.hoverOn(hk), leave: this.hoverOff(hk) };
    });
    const choiceRow = c => { const st = STATUS[c.status]; return { dot: st.dot, dotBorder: st.dotBorder, deco: c.status === 'removed' ? 'line-through' : 'none', text: c.text, sub: `${st.label} · ${c.ev.length} evidence`, select: this.pick({t:'choice', id:c.id}) }; };
    const choices = rows.map(({ c, x, y, j, collapsed }) => {
      const st = STATUS[c.status]; const active = selC && selC.id === c.id; const d = isDim(c.id);
      return { id: c.id, ghost: c.status !== 'removed' && c.ghost ? c.ghost : '', x, y, delay: (j * .07) + 's', scale: collapsed ? .62 : 1, pe: 'auto', enter: null, leave: null, text: c.text, bg: st.bg, dotBorder: st.dotBorder, border: active ? 'var(--accent)' : st.border, borderStyle: st.style, color: st.color, dot: st.dot, deco: c.status === 'removed' ? 'line-through' : 'none', shadow: active ? ACTIVE_SHADOW : '0 1px 2px var(--shadow)', meta: c.status === 'suggested' ? '?' : (c.ev.length ? c.ev.length + ' ev' : '—'), metaColor: 'var(--muted)', op: collapsed ? .45 : d ? .3 : 1, select: this.pick(active ? null : {t:'choice', id:c.id}) };
    });
    const resChip = (id, extra) => { const r = RES.find(x => x.id === id); return { name: r.name + (r.have ? '' : ' · missing'), border: r.have ? 'var(--border)' : 'var(--red-line)', fg: r.have ? 'var(--text)' : 'var(--red-text)', select: this.pick({t:'resource', id}) , ...extra }; };
    const histRow = (c, h) => ({ week: wkLabel(h.wk), type: h.type, note: h.note, color: TYPE_COLOR[h.type], dot: TYPE_DOT[h.type], choiceText: c.text, select: (e) => { e.stopPropagation(); this.setState({ sel: {t:'choice', id:c.id}, week: Math.max(h.wk, 1) }); } });

    // overview
    const score = Math.round(this.overall(W) * 100); const prev = W > 1 ? Math.round(this.overall(W - 1) * 100) : null; const dlt = prev === null ? null : score - prev;
    const active = view.filter(c => c.status !== 'removed');
    const sug = view.find(c => c.status === 'suggested'); const sugFor = sug && LINKS.find(l => l[1] === sug.id); 
    const ranked = PILLARS.map(p => ({ p, ...pillarInfo(p) })).filter(x => x.has).sort((a, b) => a.avg - b.avg);
    const gaps = RES.filter(r => !r.have).map(r => ({ r, n: active.filter(c => c.res.includes(r.id)).length })).filter(g => g.n).map(g => ({ name: g.r.name, n: g.n + (g.n === 1 ? ' choice' : ' choices'), select: this.pick({t:'resource', id:g.r.id}) }));
    const changes = view.flatMap(c => c.hist.filter(h => h.wk === W).map(h => histRow(c, h)));
    const ovColor = confColor(score / 100);
    const ov = { score, ring: `conic-gradient(${ovColor} ${Math.round(score * 3.6)}deg, var(--border) 0)`, scoreColor: confText(score / 100), delta: dlt === null ? 'First week' : dlt === 0 ? 'No change since last week' : `${dlt > 0 ? '+' : ''}${dlt} since week ${W - 1}`, deltaColor: dlt > 0 ? 'var(--green-text)' : dlt < 0 ? 'var(--red-text)' : 'var(--muted)',
      nSup: active.filter(c => c.status === 'strengthened').length, nUnt: active.filter(c => c.status === 'guess' || c.status === 'added').length, nWeak: active.filter(c => c.status === 'weakened').length, nSug: active.filter(c => c.status === 'suggested').length,
      hasSuggestion: !!sug, suggestionText: sug ? sug.text : '', suggestionFor: sugFor && find(sugFor[0]) ? find(sugFor[0]).text : '', suggestionNote: sugFor && find(sugFor[0]) ? `Replacement for “${find(sugFor[0]).text}” · tap to review` : sug ? `New choice under ${sug.pillar} · tap to review` : '', openSuggestion: sug ? this.pick({t:'choice', id:sug.id}) : null,
      weakest: ranked.length ? ranked[0].p : '—', gaps, noGaps: !gaps.length, changes, noChanges: !changes.length, changesTitle: `Changes in week ${W}` };

    // pillar view
    let pv = null;
    if (mode === 'pillar') {
      const p = sel.id; const info = pillarInfo(p); const cs = view.filter(c => c.pillar === p); const act = cs.filter(c => c.status !== 'removed');
      const evN = cs.reduce((a, c) => a + c.ev.length, 0); const resIds = [...new Set(act.flatMap(c => c.res))]; const gapsN = resIds.filter(id => !RES.find(r => r.id === id).have).length;
      const tests = act.filter(c => c.status !== 'strengthened' && c.test !== '—').map(c => ({ choice: c.text, text: c.test, select: this.pick({t:'choice', id:c.id}) }));
      pv = { name: p, glyph: FX[p].glyph, pct: info.pct, ring: `conic-gradient(${info.ringColor} ${Math.round(info.avg * 360)}deg, var(--border) 0)`, label: info.label, labelColor: info.labelColor, summary: `${act.length} active ${act.length === 1 ? 'choice' : 'choices'} · ${evN} evidence · ${gapsN ? gapsN + ' resource gap' + (gapsN > 1 ? 's' : '') : 'no resource gaps'}`,
        choices: cs.map(choiceRow), tests, noTests: !tests.length, resources: resIds.map(id => resChip(id)), noRes: !resIds.length,
        history: cs.flatMap(c => c.hist.map(h => histRow(c, h))).sort((a, b) => parseInt(b.week.slice(3)) - parseInt(a.week.slice(3))) };
    }

    // choice view
    let cv = null;
    if (selC && mode === 'choice') {
      const c = selC; const st = STATUS[c.status]; const nFor = c.ev.filter(e => e.k === 'support').length, nAg = c.ev.length - nFor; const tot = Math.max(1, c.ev.length);
      const links = LINKS.filter(l => l[0] === c.id || l[1] === c.id).map(l => { const o = find(l[0] === c.id ? l[1] : l[0]); if (!o) return null; const s = STATUS[o.status]; return { text: o.text, note: l[2] + ' · ' + s.label, dot: s.dot, dotBorder: s.dotBorder, select: this.pick({t:'choice', id:o.id}) }; }).filter(Boolean);
      cv = { pillar: c.pillar, selectPillar: this.pick({t:'pillar', id:c.pillar}), text: c.text, statusLabel: st.label, chipBg: st.chipBg, chipFg: st.chipFg, summary: SUMMARY[c.status], since: wkLabel(c.hist[c.hist.length - 1].wk), isSuggested: c.status === 'suggested',
        nFor, nAgainst: nAg, forPct: Math.round(nFor / tot * 100), againstPct: Math.round(nAg / tot * 100), evCount: c.ev.length, noEvidence: !c.ev.length,
        evidence: c.ev.map((e, i) => ({ text: e.text, source: e.source, accent: e.k === 'support' ? 'var(--green)' : 'var(--red)', select: this.pick({t:'evidence', cid:c.id, idx:i}) })),
        canEdit: !isPast && c.status !== 'removed' && c.status !== 'suggested', test: c.test === '—' ? 'Removed. No further tests planned.' : c.test,
        noResources: !c.res.length, resources: c.res.map(id => resChip(id)), hasLinks: !!links.length, links,
        history: c.hist.slice().reverse().map(h => histRow(c, h)), canRemove: !isPast && c.status !== 'removed' && c.status !== 'suggested' };
    }

    // evidence view
    let ev = null;
    if (mode === 'evidence' && selC) {
      const c = selC; const e = c.ev[sel.idx] || c.ev[0]; const st = STATUS[c.status];
      const h = c.hist.find(x => x.wk === e.wk && x.type !== 'Added'); const sup = e.k === 'support';
      ev = { pillar: c.pillar, selectPillar: this.pick({t:'pillar', id:c.pillar}), selectChoice: this.pick({t:'choice', id:c.id}), text: e.text, source: e.source + ' · ' + wkLabel(e.wk), kindLabel: sup ? 'Supports' : 'Undermines', chipBg: sup ? 'var(--green-tint)' : 'var(--red-tint)', chipFg: sup ? 'var(--green-text)' : 'var(--red-text)',
        impact: h ? `${h.type} “${c.text}” in week ${h.wk}. ${h.note}.` : `Logged in week ${e.wk}. On its own it did not change the status of “${c.text}”.`,
        choiceText: c.text, dot: st.dot, dotBorder: st.dotBorder,
        siblings: c.ev.map((s, i) => ({ s, i })).filter(x => x.i !== sel.idx).map(x => ({ text: x.s.text, accent: x.s.k === 'support' ? 'var(--green)' : 'var(--red)', select: this.pick({t:'evidence', cid:c.id, idx:x.i}) })) };
      ev.noSiblings = !ev.siblings.length;
    }

    // resource view
    let rv = null;
    if (selRes) {
      const users = view.filter(c => c.res.includes(selRes.id) && c.status !== 'removed');
      rv = { name: selRes.name, missing: !selRes.have, statusLabel: selRes.have ? 'Available' : 'Missing', chipBg: selRes.have ? 'var(--surface-2)' : 'var(--red-tint)', chipFg: selRes.have ? 'var(--muted)' : 'var(--red-text)',
        summary: selRes.have ? `On hand. ${users.length} ${users.length === 1 ? 'choice depends' : 'choices depend'} on it.` : `Not on hand. ${users.length} ${users.length === 1 ? 'choice is' : 'choices are'} blocked until the team secures it.`,
        acquire: (e) => { e.stopPropagation(); this.setState(s => ({ resources: s.resources.map(r => r.id === selRes.id ? { ...r, have: true } : r) })); this.say(`${selRes.name} marked as acquired · ${users.length} ${users.length === 1 ? 'choice' : 'choices'} unblocked`); },
        n: users.length, choices: users.map(choiceRow),
        all: RES.map(r => { const n = view.filter(c => c.res.includes(r.id) && c.status !== 'removed').length; return { name: r.name, dot: r.have ? 'var(--green)' : 'var(--red)', weight: r.id === selRes.id ? 600 : 400, sub: `${n} ${n === 1 ? 'choice' : 'choices'}`, select: this.pick({t:'resource', id:r.id}) }; }) };
    }

    // App: bounds of everything visible, for Fit to screen.
    { const B = { minX: CX - 60, maxX: CX + 60, minY: CY - 60, maxY: CY + 60 }; const add = (x, y, w, h) => { B.minX = Math.min(B.minX, x - w / 2); B.maxX = Math.max(B.maxX, x + w / 2); B.minY = Math.min(B.minY, y - h / 2); B.maxY = Math.max(B.maxY, y + h / 2); };
      pillars.forEach(p => add(p.x, p.y, 84, 84)); choices.forEach(c => add(c.x, c.y, 156 * c.scale, 52 * c.scale)); orbit.forEach(o => add(o.x, o.y, 176, 44)); this._bounds = B;
      const boxes = {}; const grow = (k, x, y, w, h) => { const b = boxes[k] || (boxes[k] = { minX: x, maxX: x, minY: y, maxY: y }); b.minX = Math.min(b.minX, x - w / 2); b.maxX = Math.max(b.maxX, x + w / 2); b.minY = Math.min(b.minY, y - h / 2); b.maxY = Math.max(b.maxY, y + h / 2); };
      pillars.forEach(p => grow(p.name, p.x, p.y, 84, 84)); rows.forEach(r => grow(r.c.pillar, r.x, r.y, 156, 52)); orbit.forEach(o => grow('orbit', o.x, o.y, 176, 44)); this._boxes = boxes; }
    const weeks = Array.from({ length: NOW }, (_, i) => i + 1).map(n => { const chg = allC.reduce((a, c) => a + c.hist.filter(h => h.wk === n && h.type !== 'Added').length, 0); return { n, bg: n === W ? 'var(--accent)' : 'transparent', fg: n === W ? 'var(--on-accent)' : 'var(--muted)', dot: n === W ? 'transparent' : chg ? 'var(--muted)' : 'transparent', current: n === W, title: `Week ${n} · confidence ${Math.round(this.overall(n) * 100)}%`, select: (e) => { e.stopPropagation(); clearInterval(this._replay); this.setState({ week: n, replaying: false }); } }; });
    const evTotal = view.reduce((a, c) => a + c.ev.length, 0);
    const ovOpen = this.state.widget === 'overview';

    return {
      ideaName: this.name, ideaPitch: this.pitch, ideaInitial: (this.name || '?').charAt(0).toUpperCase(), now: NOW,
      paneRef: this.setPane, worldRef: this.worldRef, pctRef: this.pctRef, edges, curves, pillars, choices, orbit, particles, flows, weeks, week: W, isPast,
      zoomIn: (e) => { e.stopPropagation(); this.zoomStep(1.25); }, zoomOut: (e) => { e.stopPropagation(); this.zoomStep(1 / 1.25); },
      zoomFit: (e) => { e.stopPropagation(); this.fit(); },
      counts: `Week ${W} of ${NOW} · ${active.length} choices · ${evTotal} evidence`,
      replayLabel: this.state.replaying ? 'Stop' : '▶ Replay',
      showHint: !expanded.length && !isPast,
      toggleAllLabel: expanded.length === PILLARS.length ? 'Collapse' : 'Expand all',
      toggleAll: (e) => { e.stopPropagation(); this.setState(s => ({ expanded: s.expanded.length === PILLARS.length ? [] : [...PILLARS], sel: s.expanded.length === PILLARS.length ? null : s.sel }), () => this.fit()); },
      ideaShadow: mode === 'idea' && sel ? '0 0 0 6px var(--focus-ring), 0 12px 32px var(--shadow)' : '0 0 0 10px color-mix(in srgb, var(--accent) 10%, transparent), 0 12px 32px var(--shadow)',
      hoverIdea: this.state.hoverIdea, hoverOn: () => this.setState({ hoverIdea: true }), hoverOff: () => this.setState({ hoverIdea: false }),
      isIdea: ovOpen && mode === 'idea', isPillar: ovOpen && mode === 'pillar', isChoice: ovOpen && mode === 'choice', isEvidence: ovOpen && mode === 'evidence', isResource: ovOpen && mode === 'resource',
      // App: widgets. The rail switches what the sidebar shows; widgets feed the tree through applyWidget().
      widget: this.state.widget, setWidget: (w) => this.setState({ widget: w }), showBadge: !!sug && !ovOpen,
      ideaId: this.ideaId, isPantry: this.ideaId === 'pantry', wmem: this.state.wmem,
      setWmem: (key, patch) => this.setState(s => ({ wmem: { ...s.wmem, [key]: { ...(s.wmem[key] || {}), ...patch } } })),
      pillarPct: Object.fromEntries(pillars.map(p => [p.name, p.pct])),
      buildIdea: () => mapToIdea({ id: this.ideaId, pitch: this.pitch, choices: this.state.choices, links: this.state.links, base: this.base }),
      applyWidget: (updates, sourceLabel, toast) => this.applyWidget(updates, sourceLabel, toast),
      openOverview: () => this.setState({ widget: 'overview', sel: null }),
      ov, pv, cv, ev, rv,
      hasToast: !!this.state.toast, toast: this.state.toast,
      draft: this.state.draft, setDraft: (e) => this.setState({ draft: e.target.value }),
      clearSel: () => { if (this._suppressClick) { this._suppressClick = false; return; } this.setState({ sel: null }); }, selIdea: this.pick({t:'idea'}), goNow: (e) => { e.stopPropagation(); this.setState({ week: NOW }); },
      replay: (e) => { e.stopPropagation(); if (this.state.replaying) { clearInterval(this._replay); this.setState({ replaying: false }); return; } this.setState({ week: 1, sel: null, replaying: true, expanded: [...PILLARS] }, () => this.fit()); this._replay = setInterval(() => { if (this.state.week >= NOW) { clearInterval(this._replay); this.setState({ replaying: false }, () => this.fit()); return; } this.setState(s => ({ week: s.week + 1 })); }, 1400); },
      addFor: (e) => this.addEvidence(e, 'support'), addAgainst: (e) => this.addEvidence(e, 'against'),
      removeChoice: (e) => { e.stopPropagation(); const c = selC; this.setState(s => ({ sel: {t:'pillar', id:c.pillar}, choices: s.choices.map(x => x.id === c.id ? { ...x, hist: [...x.hist, { wk: NOW, type: 'Removed', note: 'Removed by founder' }] } : x) })); this.say(`“${c.text}” removed · ${c.pillar} recalculated`); },
      // App: accept / reject work on whichever suggestion is open (the design hard-coded Pantry's c12 / c13).
      accept: (e) => { e.stopPropagation(); const c = selC; if (!c) return; const l = LINKS.find(x => x[1] === c.id); const old = l ? find(l[0]) : null; this.setState(s => ({ sel: {t:'choice', id:c.id}, choices: s.choices.map(x => x.id === c.id ? { ...x, hist: [...x.hist, { wk: NOW, type: 'Added', note: 'Founder accepted replacement' }] } : old && x.id === old.id ? { ...x, hist: [...x.hist, { wk: NOW, type: 'Removed', note: 'Replaced by ' + c.text }] } : x) })); this.say(old ? `Replacement accepted · “${old.text}” retired` : `“${c.text}” accepted`); },
      reject: (e) => { e.stopPropagation(); const c = selC; if (!c) return; const l = LINKS.find(x => x[1] === c.id); const old = l ? find(l[0]) : null; this.setState(s => ({ sel: old ? {t:'choice', id:old.id} : null, choices: s.choices.filter(x => x.id !== c.id) })); this.say(old ? `Suggestion rejected · “${old.text}” stays ${STATUS[old.status].label.toLowerCase()}` : 'Suggestion rejected'); },
    };
  }
  addEvidence(e, k) {
    e.stopPropagation(); const text = this.state.draft.trim(); if (!text) { this.say('Write what you learned first'); return; }
    const id = this.state.sel.id; const c = this.state.choices.find(x => x.id === id); const type = k === 'support' ? 'Strengthened' : 'Weakened';
    // App: same path as every widget result (src/ideas/applyUpdates.ts).
    this.setState({ draft: '' });
    this.applyWidget([{ action: k === 'support' ? 'strengthen' : 'weaken', choiceId: id, reason: k === 'support' ? 'New supporting evidence' : 'New evidence against', evidence: [{ type: 'source', text, origin: 'founder', tier: 'real' }], source: 'founder' }],
      'Added by you, wk ' + this.now, `${type} “${c.text}” · ${c.pillar} recalculated`);
  }
  // App: apply TreeUpdates from a widget (or the founder) to the map. Writes evidence + history,
  // opens the affected pillars and pulses them. Returns what changed, for "What this changed" lists.
  applyWidget(updates, sourceLabel, toast) {
    const r = applyUpdates({ choices: this.state.choices, links: this.state.links }, updates, { week: this.now, sourceLabel });
    if (!r.changes.length) return r.changes;
    const top = r.changes[0];
    const text = top.type === 'Suggested' ? 'Suggested' : top.type;
    this.setState(s => ({ choices: r.choices, links: r.links, week: this.now, expanded: [...new Set([...s.expanded, ...r.pillars])], flash: { pillars: r.pillars, text, key: Date.now() } }), () => this.reveal(r.pillars));
    clearTimeout(this._flashT); this._flashT = setTimeout(() => this.setState({ flash: null }), 1800);
    if (toast !== false) this.say(toast || `${top.type} “${top.choiceText}” · ${top.pillar} recalculated`);
    return r.changes;
  }
}

export default Component;
