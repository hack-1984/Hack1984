// Logic for the IdeaMap screen, from the Claude Design file "Idea Map.dc.html".
// Changes from the design: page links point at app routes, keyframe names carry the
// "im-" prefix, and the canned Pantry data is gone (see the import block below).
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
import { Session } from "@/session";
import { PILLAR_KEYS } from "@/lib/pillars";
import { adopt, applyUpdates, ideaStore, pitchFrom, reject as rejectChoice, toMapModel, toStored } from "@/lib/db";
// App change: no canned data. The idea comes from the store (?id=), the map
// shape from toMapModel(idea, team), and every founder action is a TreeUpdate
// applied with applyUpdates and saved. ?new=1 shows a minimal probe
// (title + description) until the real probe screen lands.
const PILLARS = ['Customer','Problem','Solution','Approach','Edge','Reach','Revenue','Risks'];
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
const STATUS = {
  strengthened:{label:'Strengthened', dot:'#15803d', dotBorder:'transparent', border:'#e5e7eb', bg:'#fff', color:'#111827', style:'solid', chipBg:'#dcfce7', chipFg:'#15803d'},
  added:{label:'Added', dot:'#fff', dotBorder:'#9ca3af', border:'#e5e7eb', bg:'#fff', color:'#111827', style:'solid', chipBg:'#f3f4f6', chipFg:'#4b5563'},
  guess:{label:'Guess', dot:'#fff', dotBorder:'#9ca3af', border:'#e5e7eb', bg:'#fff', color:'#374151', style:'solid', chipBg:'#f3f4f6', chipFg:'#4b5563'},
  weakened:{label:'Weakened', dot:'#dc2626', dotBorder:'transparent', border:'#fecaca', bg:'#fff', color:'#111827', style:'solid', chipBg:'#fee2e2', chipFg:'#b91c1c'},
  removed:{label:'Removed', dot:'#e5e7eb', dotBorder:'transparent', border:'#e5e7eb', bg:'#f3f4f6', color:'#9ca3af', style:'solid', chipBg:'#f3f4f6', chipFg:'#6b7280'},
  suggested:{label:'Suggested', dot:'#fff', dotBorder:'#111827', border:'#111827', bg:'#fff', color:'#111827', style:'dashed', chipBg:'#111827', chipFg:'#fff'},
};
const TYPE_COLOR = {Strengthened:'#15803d', Added:'#374151', Weakened:'#b91c1c', Removed:'#6b7280', Suggested:'#111827'};
const TYPE_DOT = {Strengthened:'#15803d', Added:'#9ca3af', Weakened:'#dc2626', Removed:'#e5e7eb', Suggested:'#111827'};
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
const line = (a, b) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
const seg = (a, b, o) => { const dx = b[0] - a[0], dy = b[1] - a[1]; return { x: a[0], y: a[1], len: Math.hypot(dx, dy), rot: Math.atan2(dy, dx) * 180 / Math.PI, style: o.dash ? 'dashed' : 'solid', ...o }; };
const wkLabel = n => 'wk ' + n;
const confColor = v => v >= .75 ? '#15803d' : v >= .45 ? '#eab308' : '#dc2626';
const confText = v => v >= .75 ? '#15803d' : v >= .45 ? '#a16207' : '#b91c1c';
const statusAt = (c, W) => {
  const h = c.hist.filter(x => x.wk <= W); if (!h.length) return null;
  const last = h[h.length - 1];
  if (last.type === 'Strengthened') return 'strengthened';
  if (last.type === 'Weakened') return 'weakened';
  if (last.type === 'Removed') return 'removed';
  if (last.type === 'Suggested') return 'suggested';
  return W - last.wk <= 1 ? 'added' : 'guess';
};

class Component extends DCLogic {
  state = { sel:null, week:1, now:1, hoverIdea:false, hover:null, draft:'', toast:null, expanded:[], zoom:1, choices: [], resources: [], links: [], replaying:false, loading:true, idea:null, team:null, title:'', description:'', probe:null, busy:false, missing:false };
  paneRef = React.createRef();
  async componentDidMount() {
    const fit = () => { const el = this.paneRef.current; if (!el || !el.clientWidth) return false; this.setZoom(Math.min(el.clientWidth / 1340, el.clientHeight / 1100, 1.5)); return true; };
    if (!fit()) requestAnimationFrame(() => { if (!fit()) setTimeout(fit, 300); });
    setTimeout(fit, 50);
    this._wheel = (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); this.setZoom(this.state.zoom * (e.deltaY > 0 ? .9 : 1.1)); };
    const el0 = this.paneRef.current; if (el0) el0.addEventListener('wheel', this._wheel, { passive: false });
    this._key = (e) => {
      if (e.target && /TEXTAREA|INPUT/.test(e.target.tagName)) return;
      if (e.key === 'Escape') this.setState({sel:null});
      if (e.key === '+' || e.key === '=') this.setZoom(this.state.zoom * 1.2);
      if (e.key === '-') this.setZoom(this.state.zoom / 1.2);
      if (e.key === '0') { const el = this.paneRef.current; if (el) this.setZoom(Math.min(el.clientWidth / 1340, el.clientHeight / 1100, 1.5)); }
      if (e.key === 'ArrowLeft') this.setState(s => ({week: Math.max(1, s.week - 1)}));
      if (e.key === 'ArrowRight') this.setState(s => ({week: Math.min(s.now, s.week + 1)}));
    };
    window.addEventListener('keydown', this._key);

    // App change: load the idea.
    await Session.ready(); if (!Session.getSession()) { location.replace('/login'); return; }
    const params = new URLSearchParams(location.search);
    const store = ideaStore();
    let team = null; try { team = await store.getTeam(); } catch (err) { console.warn('[map] team', err); }
    if (params.get('new') === '1') { this.setState({ loading: false, team, probe: { title: '', description: '' } }); return; }
    let id = params.get('id');
    try {
      if (!id) {
        const list = await store.list();
        if (!list.length) { this.setState({ loading: false, team, probe: { title: '', description: '' } }); return; }
        id = list[0].id; history.replaceState(null, '', `/map?id=${id}`);
      }
      const idea = await store.get(id);
      if (!idea) { this.setState({ loading: false, team, missing: true }); return; }
      this.load(idea, team);
    } catch (err) { console.error('[map] load', err); this.setState({ loading: false, team, missing: true }); }
  }
  /** Derive the map from a stored Idea. Pillar names stay the design's startup labels, which key FX and angles. */
  load(idea, team) {
    const m = toMapModel(idea, team);
    this.setState({ idea, team, loading: false, probe: null, missing: false,
      choices: m.choices.map(c => ({ ...c, pillar: PILLARS[PILLAR_KEYS.indexOf(c.pillarKey)] })),
      resources: m.resources, links: m.links, now: m.now, week: m.now, title: m.title, description: m.description });
  }
  /** Save an already-changed idea, then re-derive. */
  async persist(idea, patch, msg) {
    this.setState({ busy: true, ...(patch || {}) });
    try { await ideaStore().save(idea); this.load(idea, this.state.team); if (msg) this.say(msg); }
    catch (err) { console.error('[map] save', err); this.say('Could not save. Check your connection.'); }
    finally { this.setState({ busy: false }); }
  }
  /** Apply TreeUpdates to the idea and save. */
  commit(updates, msg, patch) { return this.persist(applyUpdates(this.state.idea, updates), patch, msg); }
  /** The placeholder probe: POST /api/tree, wrap with the probe fields, save, show. */
  async createIdea(e) {
    if (e && e.preventDefault) e.preventDefault();
    const probe = this.state.probe; if (!probe || this.state.busy) return;
    if (!probe.title.trim() && !probe.description.trim()) { this.say('Give the idea a title or a description first'); return; }
    this.setState({ busy: true });
    try {
      const team = this.state.team || { roles: [], skills: [], tech: [] };
      const res = await fetch('/api/tree', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pitch: pitchFrom(probe), team, mode: 'startup' }) });
      if (!res.ok) throw new Error(`tree ${res.status}`);
      const { idea } = await res.json();
      const stored = toStored(idea, probe);
      await ideaStore().save(stored);
      history.replaceState(null, '', `/map?id=${stored.id}`);
      this.load(stored, team);
    } catch (err) { console.error('[map] create', err); this.say('Could not grow the tree. Try again.'); }
    finally { this.setState({ busy: false }); }
  }
  setZoom(z) {
    z = Math.max(.3, Math.min(2, z)); const el = this.paneRef.current; const prev = this.state.zoom;
    const cx = el ? (el.scrollLeft + el.clientWidth / 2) / prev : 0, cy = el ? (el.scrollTop + el.clientHeight / 2) / prev : 0;
    this.setState({ zoom: z }, () => { if (!el) return; el.scrollLeft = Math.max(0, cx * z - el.clientWidth / 2); el.scrollTop = Math.max(0, cy * z - el.clientHeight / 2); });
  }
  componentWillUnmount() { window.removeEventListener('keydown', this._key); const el = this.paneRef.current; if (el) el.removeEventListener('wheel', this._wheel); clearInterval(this._replay); clearTimeout(this._toastT); }
  say(msg) { clearTimeout(this._toastT); this.setState({toast: msg}); this._toastT = setTimeout(() => this.setState({toast:null}), 2600); }
  pick(sel) { return (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.setState(s => { let expanded = s.expanded; const cid = sel && (sel.t === 'choice' ? sel.id : sel.t === 'evidence' ? sel.cid : null); if (cid) { const c = s.choices.find(x => x.id === cid); if (c && !expanded.includes(c.pillar)) expanded = [...expanded, c.pillar]; } if (sel && sel.t === 'pillar' && !expanded.includes(sel.id)) expanded = [...expanded, sel.id]; if (sel && sel.t === 'resource') { const ps = s.choices.filter(c => c.res.includes(sel.id)).map(c => c.pillar); expanded = [...new Set([...expanded, ...ps])]; } return { sel, draft:'', expanded }; }); }; }
  hoverOn(k) { return () => this.setState({ hover: k }); }
  hoverOff(k) { return () => this.setState(s => s.hover === k ? { hover: null } : null); }
  togglePillar(p) { return (e) => { e.stopPropagation(); this.setState(s => { const open = s.expanded.includes(p); const selected = s.sel && s.sel.t === 'pillar' && s.sel.id === p; if (open && selected) return { expanded: s.expanded.filter(x => x !== p), sel: null }; return { expanded: open ? s.expanded : [...s.expanded, p], sel: {t:'pillar', id:p}, draft:'' }; }); }; }
  pillarScore(W, p) {
    const cs = this.state.choices.map(c => ({c, st: statusAt(c, W)})).filter(x => x.c.pillar === p && x.st && x.st !== 'suggested' && x.st !== 'removed');
    return cs.length ? cs.reduce((a, x) => a + SCORE[x.st], 0) / cs.length : null;
  }
  overall(W) { const s = PILLARS.map(p => this.pillarScore(W, p)).filter(x => x !== null); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0; }

  renderVals() {
    const NOW = this.state.now; const LINKS = this.state.links;
    const showRemoved = this.props.showRemoved ?? true;
    const dim = this.props.dimUnrelated ?? true;
    const { sel, week: W, choices: allC, resources: RES } = this.state;
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
    PILLARS.forEach(p => { if (!expanded.includes(p)) return; const collapsed = focused && !pillarActive0(p); const cs = view.filter(c => c.pillar === p); cs.forEach((c, j) => { const ang = pillarAng[p] + (j - (cs.length - 1) / 2) * 24; const [x, y] = collapsed ? pol(R2 * .66, ang) : pol(R2, ang); rows.push({ c, x, y, ang, j, collapsed }); }); });
    const rowOf = id => rows.find(r => r.c.id === id);

    const edges = [], curves = [];
    const pillarActive = pillarActive0;
    PILLARS.forEach(p => { const d = dim && focused && !pillarActive(p); edges.push(seg([CX, CY], pPos(p), { stroke: '#d1d5db', w: 1.5, dash: false, op: .8 })); });
    rows.forEach(({ c, x, y, collapsed }) => { const d = isDim(c.id); edges.push(seg(pPos(c.pillar), [x, y], { stroke: c.status === 'removed' ? '#e5e7eb' : c.status === 'weakened' ? '#fecaca' : '#d1d5db', w: 1.25, dash: c.status === 'suggested', op: collapsed ? .7 : d ? .4 : .7 })); });
    LINKS.forEach(([a, b]) => { const ra = rowOf(a), rb = rowOf(b); if (!ra || !rb) return; const hi = selC && (selC.id === a || selC.id === b); const m = pol(R2 + 70, (ra.ang + rb.ang) / 2); curves.push({ d: `M${ra.x} ${ra.y} Q${m[0]} ${m[1]} ${rb.x} ${rb.y}`, stroke: '#9ca3af', w: 1.25, dash: '3 3', op: hi ? .9 : .4 }); });

    const orbit = [];
    const evItem = (c, e, i) => ({ text: e.text, kind: e.k === 'support' ? 'for' : 'against', accent: e.k === 'support' ? '#15803d' : '#dc2626', kindColor: e.k === 'support' ? '#15803d' : '#b91c1c', key: c.id + ':' + i, select: this.pick({t:'evidence', cid:c.id, idx:i}) });
    const resItem = (r) => ({ text: r.name, kind: r.have ? 'have' : 'missing', accent: r.have ? '#9ca3af' : '#dc2626', kindColor: r.have ? '#6b7280' : '#b91c1c', key: 'r:' + r.id, select: this.pick({t:'resource', id:r.id}) });
    const fan = (items, cx, cy, ang, step) => items.forEach((it, i) => { const a = ang + (i - (items.length - 1) / 2) * step; const [x, y] = pol(R3, a); const active = (mode === 'evidence' && it.key === sel.cid + ':' + sel.idx) || (mode === 'resource' && it.key === 'r:' + sel.id); orbit.push({ ...it, x, y, delay: (i * .06) + 's', scale: 1, enter: null, leave: null, border: active ? '#111827' : '#e5e7eb', shadow: active ? '0 0 0 3px #11182722, 0 4px 12px #1118271f' : '0 2px 8px #0000000f' }); edges.push(seg([cx, cy], [x, y], { stroke: active ? '#111827' : '#d1d5db', w: 1.25, dash: it.key.startsWith('r:'), op: .85 })); });
    if (selC) { const r = rowOf(selC.id); if (r) fan([...selC.ev.map((e, i) => evItem(selC, e, i)), ...selC.res.map(id => resItem(RES.find(x => x.id === id)))], r.x, r.y, r.ang, 15); }
    if (mode === 'pillar') { view.filter(c => c.pillar === sel.id).forEach(c => { const r = rowOf(c.id); const items = [...c.ev.map((e, i) => evItem(c, e, i)), ...c.res.map(id => resItem(RES.find(x => x.id === id)))].slice(0, 4); fan(items, r.x, r.y, r.ang, 12); }); }
    if (selRes) { const users = view.filter(c => c.res.includes(selRes.id)); if (users.length) { const angs = users.map(c => rowOf(c.id).ang); const mean = angs.reduce((a, b) => a + b, 0) / angs.length; const [x, y] = pol(R3, mean); orbit.push({ ...resItem(selRes), x, y, delay: '0s', scale: 1, enter: null, leave: null, border: '#111827', shadow: '0 0 0 3px #11182722, 0 4px 12px #1118271f' }); users.forEach(c => { const r = rowOf(c.id); edges.push(seg([r.x, r.y], [x, y], { stroke: '#111827', w: 1.25, dash: true, op: .8 })); }); } }

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
      return { name: p, x, y, glyph: FX[p].glyph, delay: (i * .05) + 's', rowDelay: (i * .04) + 's', badge: open ? '–' : nC, badgeBg: open ? '#111827' : '#fff', badgeBorder: open ? '#fff' : '#111827', badgeFg: open ? '#fff' : '#111827', badgeDelay: (.3 + i * .05) + 's', ring: `conic-gradient(${info.ringColor} ${Math.round(info.avg * 360)}deg, #e5e7eb 0)`, title: `${info.label} · ${info.pct}%`, shadow: active ? '0 0 0 4px #11182726' : '0 1px 2px #0000000a', pct: info.pct, label: info.label, labelColor: info.labelColor, op: shrunk ? .85 : 1, scale: hov(hk, shrunk ? .66 : 1), select: this.togglePillar(p), enter: this.hoverOn(hk), leave: this.hoverOff(hk) };
    });
    const choiceRow = c => { const st = STATUS[c.status]; return { dot: st.dot, dotBorder: st.dotBorder, deco: c.status === 'removed' ? 'line-through' : 'none', text: c.text, sub: `${st.label} · ${c.ev.length} evidence`, select: this.pick({t:'choice', id:c.id}) }; };
    const choices = rows.map(({ c, x, y, j, collapsed }) => {
      const st = STATUS[c.status]; const active = selC && selC.id === c.id; const d = isDim(c.id);
      return { x, y, delay: (j * .07) + 's', scale: collapsed ? .62 : 1, pe: 'auto', enter: null, leave: null, text: c.text, bg: st.bg, dotBorder: st.dotBorder, border: active ? '#111827' : st.border, borderStyle: st.style, color: st.color, dot: st.dot, deco: c.status === 'removed' ? 'line-through' : 'none', shadow: active ? '0 0 0 3px #11182722, 0 4px 12px #1118271f' : '0 1px 2px #0000000a', meta: c.status === 'suggested' ? '?' : (c.ev.length ? c.ev.length + ' ev' : '—'), metaColor: c.ev.length ? '#6b7280' : '#9ca3af', op: collapsed ? .45 : d ? .3 : 1, select: this.pick(active ? null : {t:'choice', id:c.id}) };
    });
    const resChip = (id, extra) => { const r = RES.find(x => x.id === id); return { name: r.name + (r.have ? '' : ' · missing'), border: r.have ? '#e5e7eb' : '#fecaca', fg: r.have ? '#374151' : '#b91c1c', select: this.pick({t:'resource', id}) , ...extra }; };
    const histRow = (c, h) => ({ week: wkLabel(h.wk), type: h.type, note: h.note, color: TYPE_COLOR[h.type], dot: TYPE_DOT[h.type], choiceText: c.text, select: (e) => { e.stopPropagation(); this.setState({ sel: {t:'choice', id:c.id}, week: Math.max(h.wk, 1) }); } });

    // overview
    const score = Math.round(this.overall(W) * 100); const prev = W > 1 ? Math.round(this.overall(W - 1) * 100) : null; const dlt = prev === null ? null : score - prev;
    const active = view.filter(c => c.status !== 'removed');
    const sug = view.find(c => c.status === 'suggested'); const sugFor = sug && LINKS.find(l => l[1] === sug.id); 
    const ranked = PILLARS.map(p => ({ p, ...pillarInfo(p) })).filter(x => x.has).sort((a, b) => a.avg - b.avg);
    const gaps = RES.filter(r => !r.have).map(r => ({ r, n: active.filter(c => c.res.includes(r.id)).length })).filter(g => g.n).map(g => ({ name: g.r.name, n: g.n + (g.n === 1 ? ' choice' : ' choices'), select: this.pick({t:'resource', id:g.r.id}) }));
    const changes = view.flatMap(c => c.hist.filter(h => h.wk === W).map(h => histRow(c, h)));
    const ovColor = confColor(score / 100);
    const ov = { score, ring: `conic-gradient(${ovColor} ${Math.round(score * 3.6)}deg, #e5e7eb 0)`, scoreColor: confText(score / 100), delta: dlt === null ? 'First week' : dlt === 0 ? 'No change since last week' : `${dlt > 0 ? '+' : ''}${dlt} since week ${W - 1}`, deltaColor: dlt > 0 ? '#15803d' : dlt < 0 ? '#b91c1c' : '#6b7280',
      nSup: active.filter(c => c.status === 'strengthened').length, nUnt: active.filter(c => c.status === 'guess' || c.status === 'added').length, nWeak: active.filter(c => c.status === 'weakened').length, nSug: active.filter(c => c.status === 'suggested').length,
      hasSuggestion: !!sug, suggestionText: sug ? sug.text : '', suggestionFor: sugFor && find(sugFor[0]) ? find(sugFor[0]).text : '', openSuggestion: sug ? this.pick({t:'choice', id:sug.id}) : null,
      weakest: ranked.length ? ranked[0].p : '—', gaps, noGaps: !gaps.length, changes, noChanges: !changes.length, changesTitle: `Changes in week ${W}` };

    // pillar view
    let pv = null;
    if (mode === 'pillar') {
      const p = sel.id; const info = pillarInfo(p); const cs = view.filter(c => c.pillar === p); const act = cs.filter(c => c.status !== 'removed');
      const evN = cs.reduce((a, c) => a + c.ev.length, 0); const resIds = [...new Set(act.flatMap(c => c.res))]; const gapsN = resIds.filter(id => !RES.find(r => r.id === id).have).length;
      const tests = act.filter(c => c.status !== 'strengthened' && c.test !== '—').map(c => ({ choice: c.text, text: c.test, select: this.pick({t:'choice', id:c.id}) }));
      pv = { name: p, glyph: FX[p].glyph, pct: info.pct, ring: `conic-gradient(${info.ringColor} ${Math.round(info.avg * 360)}deg, #e5e7eb 0)`, label: info.label, labelColor: info.labelColor, summary: `${act.length} active ${act.length === 1 ? 'choice' : 'choices'} · ${evN} evidence · ${gapsN ? gapsN + ' resource gap' + (gapsN > 1 ? 's' : '') : 'no resource gaps'}`,
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
        evidence: c.ev.map((e, i) => ({ text: e.text, source: e.source, accent: e.k === 'support' ? '#15803d' : '#dc2626', select: this.pick({t:'evidence', cid:c.id, idx:i}) })),
        canEdit: !isPast && c.status !== 'removed' && c.status !== 'suggested', test: c.test === '—' ? 'Removed. No further tests planned.' : c.test,
        noResources: !c.res.length, resources: c.res.map(id => resChip(id)), hasLinks: !!links.length, links,
        history: c.hist.slice().reverse().map(h => histRow(c, h)), canRemove: !isPast && c.status !== 'removed' && c.status !== 'suggested' };
    }

    // evidence view
    let ev = null;
    if (mode === 'evidence' && selC) {
      const c = selC; const e = c.ev[sel.idx] || c.ev[0]; const st = STATUS[c.status];
      const h = c.hist.find(x => x.wk === e.wk && x.type !== 'Added'); const sup = e.k === 'support';
      ev = { pillar: c.pillar, selectPillar: this.pick({t:'pillar', id:c.pillar}), selectChoice: this.pick({t:'choice', id:c.id}), text: e.text, source: e.source + ' · ' + wkLabel(e.wk), kindLabel: sup ? 'Supports' : 'Undermines', chipBg: sup ? '#dcfce7' : '#fee2e2', chipFg: sup ? '#15803d' : '#b91c1c',
        impact: h ? `${h.type} “${c.text}” in week ${h.wk}. ${h.note}.` : `Logged in week ${e.wk}. On its own it did not change the status of “${c.text}”.`,
        choiceText: c.text, dot: st.dot, dotBorder: st.dotBorder,
        siblings: c.ev.map((s, i) => ({ s, i })).filter(x => x.i !== sel.idx).map(x => ({ text: x.s.text, accent: x.s.k === 'support' ? '#15803d' : '#dc2626', select: this.pick({t:'evidence', cid:c.id, idx:x.i}) })) };
      ev.noSiblings = !ev.siblings.length;
    }

    // resource view
    let rv = null;
    if (selRes) {
      const users = view.filter(c => c.res.includes(selRes.id) && c.status !== 'removed');
      rv = { name: selRes.name, missing: !selRes.have, statusLabel: selRes.have ? 'Available' : 'Missing', chipBg: selRes.have ? '#f3f4f6' : '#fee2e2', chipFg: selRes.have ? '#4b5563' : '#b91c1c',
        summary: selRes.have ? `On hand. ${users.length} ${users.length === 1 ? 'choice depends' : 'choices depend'} on it.` : `Not on hand. ${users.length} ${users.length === 1 ? 'choice is' : 'choices are'} blocked until the team secures it.`,
        acquire: (e) => { e.stopPropagation(); if (selRes.have) { this.say('Already on hand'); return; } const at = Date.now(); this.commit(users.map(c => ({ action: 'strengthen', choiceId: c.id, delta: 5, feasibility: { ok: true, note: selRes.name }, reason: `Team secured: ${selRes.name}`, source: 'feasibility', at })), `${selRes.name} marked as acquired · ${users.length} ${users.length === 1 ? 'choice' : 'choices'} unblocked`, { sel: null }); },
        n: users.length, choices: users.map(choiceRow),
        all: RES.map(r => { const n = view.filter(c => c.res.includes(r.id) && c.status !== 'removed').length; return { name: r.name, dot: r.have ? '#15803d' : '#dc2626', weight: r.id === selRes.id ? 600 : 400, sub: `${n} ${n === 1 ? 'choice' : 'choices'}`, select: this.pick({t:'resource', id:r.id}) }; }) };
    }

    const weeks = Array.from({ length: NOW }, (_, i) => i + 1).map(n => { const chg = allC.reduce((a, c) => a + c.hist.filter(h => h.wk === n && h.type !== 'Added').length, 0); return { n, bg: n === W ? '#111827' : 'transparent', fg: n === W ? '#fff' : '#4b5563', dot: n === W ? 'transparent' : chg ? '#9ca3af' : 'transparent', title: `Week ${n} · confidence ${Math.round(this.overall(n) * 100)}%`, select: (e) => { e.stopPropagation(); clearInterval(this._replay); this.setState({ week: n, replaying: false }); } }; });
    const evTotal = view.reduce((a, c) => a + c.ev.length, 0);

    return {
      paneRef: this.paneRef, edges, curves, pillars, choices, orbit, particles, flows, weeks, week: W, isPast,
      zoom: this.state.zoom, zoomW: Math.round(1340 * this.state.zoom), zoomH: Math.round(1100 * this.state.zoom), zoomPct: Math.round(this.state.zoom * 100) + '%',
      zoomIn: (e) => { e.stopPropagation(); this.setZoom(this.state.zoom * 1.2); }, zoomOut: (e) => { e.stopPropagation(); this.setZoom(this.state.zoom / 1.2); },
      zoomFit: (e) => { e.stopPropagation(); const el = this.paneRef.current; if (el) this.setZoom(Math.min(el.clientWidth / 1340, el.clientHeight / 1100, 1.5)); },
      counts: `Week ${W} of ${NOW} · ${active.length} choices · ${evTotal} evidence`,
      replayLabel: this.state.replaying ? 'Stop' : '▶ Replay',
      showHint: !expanded.length && !isPast,
      toggleAllLabel: expanded.length === PILLARS.length ? 'Collapse' : 'Expand all',
      toggleAll: (e) => { e.stopPropagation(); this.setState(s => ({ expanded: s.expanded.length === PILLARS.length ? [] : [...PILLARS], sel: s.expanded.length === PILLARS.length ? null : s.sel })); },
      ideaShadow: mode === 'idea' && sel ? '0 0 0 6px #11182722, 0 12px 32px #11182733' : '0 0 0 10px #11182710, 0 12px 32px #11182733',
      hoverIdea: this.state.hoverIdea, hoverOn: () => this.setState({ hoverIdea: true }), hoverOff: () => this.setState({ hoverIdea: false }),
      isIdea: mode === 'idea', isPillar: mode === 'pillar', isChoice: mode === 'choice', isEvidence: mode === 'evidence', isResource: mode === 'resource',
      ov, pv, cv, ev, rv,
      hasToast: !!this.state.toast, toast: this.state.toast,
      // App change: real idea, loading and probe states.
      title: this.state.title, description: this.state.description, initial: (this.state.title || 'I').trim().charAt(0).toUpperCase(),
      loading: this.state.loading, missing: this.state.missing, busy: this.state.busy,
      probe: !!this.state.probe, probeTitle: this.state.probe ? this.state.probe.title : '', probeDesc: this.state.probe ? this.state.probe.description : '',
      setProbeTitle: (e) => this.setState(s => ({ probe: { ...s.probe, title: e.target.value } })),
      setProbeDesc: (e) => this.setState(s => ({ probe: { ...s.probe, description: e.target.value } })),
      createIdea: (e) => this.createIdea(e),
      draft: this.state.draft, setDraft: (e) => this.setState({ draft: e.target.value }),
      clearSel: () => this.setState({ sel: null }), selIdea: this.pick({t:'idea'}), goNow: (e) => { e.stopPropagation(); this.setState({ week: NOW }); },
      replay: (e) => { e.stopPropagation(); if (this.state.replaying) { clearInterval(this._replay); this.setState({ replaying: false }); return; } this.setState({ week: 1, sel: null, replaying: true, expanded: [...PILLARS] }); this._replay = setInterval(() => { this.setState(s => { if (s.week >= NOW) { clearInterval(this._replay); return { replaying: false }; } return { week: s.week + 1 }; }); }, 1400); },
      addFor: (e) => this.addEvidence(e, 'support'), addAgainst: (e) => this.addEvidence(e, 'against'),
      removeChoice: (e) => { e.stopPropagation(); const c = selC; if (!c) return; this.commit([{ action: 'kill', choiceId: c.id, reason: 'Removed by founder', source: 'plan', at: Date.now() }], `“${c.text}” removed · ${c.pillar} recalculated`, { sel: {t:'pillar', id:c.pillar} }); },
      accept: (e) => { e.stopPropagation(); const c = selC; if (!c) return; const link = LINKS.find(l => l[1] === c.id); const parent = link && find(link[0]); this.persist(adopt(this.state.idea, c.id), { sel: {t:'choice', id:c.id} }, parent ? `Replacement accepted · “${parent.text}” retired` : `“${c.text}” accepted`); },
      reject: (e) => { e.stopPropagation(); const c = selC; if (!c) return; const link = LINKS.find(l => l[1] === c.id); this.persist(rejectChoice(this.state.idea, c.id), { sel: link ? {t:'choice', id:link[0]} : {t:'pillar', id:c.pillar} }, 'Suggestion rejected'); },
    };
  }
  addEvidence(e, k) {
    e.stopPropagation(); const text = this.state.draft.trim(); if (!text) { this.say('Write what you learned first'); return; }
    const id = this.state.sel.id; const c = this.state.choices.find(x => x.id === id); if (!c) return; const type = k === 'support' ? 'Strengthened' : 'Weakened';
    this.commit([{ action: k === 'support' ? 'strengthen' : 'weaken', choiceId: id, delta: k === 'support' ? 5 : -5, evidence: [{ type: 'quote', text, origin: 'Added by you', tier: 'real' }], reason: k === 'support' ? 'New supporting evidence' : 'New evidence against', source: 'plan', at: Date.now() }], `${type} “${c.text}” · ${c.pillar} recalculated`, { draft: '' });
  }

}

export default Component;
