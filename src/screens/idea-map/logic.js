// Logic for the IdeaMap screen, verbatim from the Claude Design file "Idea Map.dc.html".
// Only changes: page links point at app routes, keyframe names carry the "im-" prefix,
// and anything noted inline below.
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
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
  state = { sel:null, week:NOW, hoverIdea:false, hover:null, draft:'', toast:null, expanded:[], zoom:1, choices: CHOICES0.map(c => ({...c, ev:[...c.ev], hist:[...c.hist]})), resources: RESOURCES0.map(r => ({...r})), replaying:false };
  paneRef = React.createRef();
  componentDidMount() {
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
      if (e.key === 'ArrowRight') this.setState(s => ({week: Math.min(NOW, s.week + 1)}));
    };
    window.addEventListener('keydown', this._key);
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
        acquire: (e) => { e.stopPropagation(); this.setState(s => ({ resources: s.resources.map(r => r.id === selRes.id ? { ...r, have: true } : r) })); this.say(`${selRes.name} marked as acquired · ${users.length} ${users.length === 1 ? 'choice' : 'choices'} unblocked`); },
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
      draft: this.state.draft, setDraft: (e) => this.setState({ draft: e.target.value }),
      clearSel: () => this.setState({ sel: null }), selIdea: this.pick({t:'idea'}), goNow: (e) => { e.stopPropagation(); this.setState({ week: NOW }); },
      replay: (e) => { e.stopPropagation(); if (this.state.replaying) { clearInterval(this._replay); this.setState({ replaying: false }); return; } this.setState({ week: 1, sel: null, replaying: true, expanded: [...PILLARS] }); this._replay = setInterval(() => { this.setState(s => { if (s.week >= NOW) { clearInterval(this._replay); return { replaying: false }; } return { week: s.week + 1 }; }); }, 1400); },
      addFor: (e) => this.addEvidence(e, 'support'), addAgainst: (e) => this.addEvidence(e, 'against'),
      removeChoice: (e) => { e.stopPropagation(); const c = selC; this.setState(s => ({ sel: {t:'pillar', id:c.pillar}, choices: s.choices.map(x => x.id === c.id ? { ...x, hist: [...x.hist, { wk: NOW, type: 'Removed', note: 'Removed by founder' }] } : x) })); this.say(`“${c.text}” removed · ${c.pillar} recalculated`); },
      accept: (e) => { e.stopPropagation(); this.setState(s => ({ sel: {t:'choice', id:'c13'}, choices: s.choices.map(c => c.id === 'c13' ? { ...c, hist: [...c.hist, { wk: NOW, type: 'Added', note: 'Founder accepted replacement' }] } : c.id === 'c12' ? { ...c, hist: [...c.hist, { wk: NOW, type: 'Removed', note: 'Replaced by $4/month or $29/year' }] } : c) })); this.say('Replacement accepted · “Charge $8/month” retired'); },
      reject: (e) => { e.stopPropagation(); this.setState(s => ({ sel: {t:'choice', id:'c12'}, choices: s.choices.filter(c => c.id !== 'c13') })); this.say('Suggestion rejected · “Charge $8/month” stays weakened'); },
    };
  }
  addEvidence(e, k) {
    e.stopPropagation(); const text = this.state.draft.trim(); if (!text) { this.say('Write what you learned first'); return; }
    const id = this.state.sel.id; const c = this.state.choices.find(x => x.id === id); const type = k === 'support' ? 'Strengthened' : 'Weakened';
    this.setState(s => ({ draft: '', choices: s.choices.map(x => x.id === id ? { ...x, ev: [...x.ev, { k, wk: NOW, text, source: 'Added by you, wk ' + NOW }], hist: [...x.hist, { wk: NOW, type, note: k === 'support' ? 'New supporting evidence' : 'New evidence against' }] } : x) }));
    this.say(`${type} “${c.text}” · ${c.pillar} recalculated`);
  }
}

export default Component;
