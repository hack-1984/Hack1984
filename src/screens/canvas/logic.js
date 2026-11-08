// Logic for the Canvas screen, verbatim from the Claude Design file "Canvas.dc.html".
// Only changes: page links point at app routes, keyframe names carry the "cv-" prefix,
// and anything noted inline below.
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
class Component extends DCLogic {
  state = { ann: true, scrolled: false, pastHero: false, footerIn: false, active: 0, step: 0, filled: false, gIdx: -1 };

  constructor(p) {
    super(p);
    const C = { x: 370, y: 350 }, R = 200;
    const names = ['Customer','Problem','Solution','Approach','Edge','Reach','Revenue','Risks'];
    const base = [82, 76, 58, 64, 41, 71, 52, 38];
    const counts = [4, 3, 3, 2, 2, 3, 2, 1];
    const jit = [-4, 5, 0, -6, 3, -3, 6, -5];
    this.col = v => v >= 70 ? '#4CC27E' : v >= 45 ? '#F2B441' : '#F26D6D';
    this.P = names.map((name, i) => {
      const a = (-90 + i * 45 + jit[i]) * Math.PI / 180;
      return { name, i, basePct: base[i], count: counts[i], x: Math.round(C.x + R * Math.cos(a)), y: Math.round(C.y + R * Math.sin(a)),
        baseColor: this.col(base[i]), baseOffset: (219.9 * (1 - base[i] / 100)).toFixed(1),
        delay: (0.25 + i * 0.12).toFixed(2) + 's', dur: (6 + (i % 4)) + 's', phaseDelay: '-' + (i * 1.3).toFixed(1) + 's' };
    });
    const bez = (a, b, bow) => {
      const dx = b.x - a.x, dy = b.y - a.y, nx = -dy, ny = dx;
      return `M${a.x} ${a.y} C${(a.x + dx * .45 + nx * bow).toFixed(0)} ${(a.y + dy * .45 + ny * bow).toFixed(0)} ${(a.x + dx * .7 + nx * bow * .4).toFixed(0)} ${(a.y + dy * .7 + ny * bow * .4).toFixed(0)} ${b.x} ${b.y}`;
    };
    const sol = this.P[2];
    this.pillsBase = [
      { label: 'Weekly meal kits', x: 760, y: 290, state: ['#4CC27E', '#F26D6D', '#F26D6D'] },
      { label: 'Recipe-only app', x: 760, y: 350, state: ['#F2B441', '#F2B441', '#F2B441'] },
      { label: 'Campus pickup', x: 760, y: 410, state: ['#F2B441', '#F2B441', '#4CC27E'] },
    ].map((c, i) => ({ ...c, delay: (1.4 + i * .15).toFixed(2) + 's', dur: (7 + i) + 's', phaseDelay: '-' + (2 + i * 1.7).toFixed(1) + 's' }));
    this.cardsBase = [
      { x: 880, y: 270, accent: '#4CC27E', l1: '61% of students cook 3+ nights a week', l2: 'Campus dining survey, n=214', tag: 'FOR', at: 2 },
      { x: 880, y: 350, accent: '#F26D6D', l1: 'Dorm kitchens shared by 40+ people', l2: 'Housing office interview', tag: 'AGAINST', at: 3 },
      { x: 880, y: 440, accent: '#4CC27E', l1: '3 campus cafés agree to host lockers', l2: 'Partner outreach, Week 4', tag: 'FOR', at: 4 },
    ].map((k, i) => ({ ...k, delay: (1.9 + i * .15).toFixed(2) + 's', dur: (8 + i) + 's', phaseDelay: '-' + (3 + i * 2.1).toFixed(1) + 's' }));
    this.edges = [
      ...this.P.map((p, i) => ({ d: bez(C, p, i % 2 ? .12 : -.12), base: .9, at: 1, delay: (i * .12).toFixed(2) + 's' })),
      ...this.pillsBase.map((c, i) => ({ d: bez(sol, { x: c.x - 88, y: c.y }, (i - 1) * .18), base: .7, at: 2, delay: (i * .15).toFixed(2) + 's' })),
      ...this.cardsBase.map((k, i) => ({ d: bez({ x: this.pillsBase[i].x + 88, y: this.pillsBase[i].y }, { x: k.x, y: k.y }, (i - 1) * .15), base: .5, at: k.at, delay: '.15s' })),
    ];
    this.evidenceBase = [
      { accent: '#4CC27E', l1: '61% of surveyed students cook three or more nights a week', l2: 'Campus dining survey · n=214 · Week 2', tag: 'FOR', w1: '78%', w2: '52%' },
      { accent: '#F26D6D', l1: 'Shared dorm kitchens serve 40+ students each', l2: 'Housing office interview · Week 3', tag: 'AGAINST', w1: '64%', w2: '44%' },
      { accent: '#4CC27E', l1: 'Meal-plan opt-out rose 18% year over year', l2: 'University enrollment report · Week 3', tag: 'FOR', w1: '70%', w2: '58%' },
      { accent: '#F2B441', l1: 'Competing kits average $11 per meal in pilot cities', l2: 'Price scrape · 6 providers · Week 4', tag: 'AGAINST', w1: '82%', w2: '48%' },
    ];
    // aboutCopy: placeholder — copy to be written
    this.aboutCopy = 'We spent years building things nobody asked for, and learned the expensive way that the right question at week two beats the right answer at month nine. Sprout is the mentor we wish we had: patient, well-read, and unwilling to let a weak assumption slide. It started as an internal tool for a university accelerator and grew into a product when founders kept asking to keep using it after demo day. We are a small team of engineers, researchers, and former program directors. We believe most ideas deserve a fair test, and most founders deserve it sooner.';
    // team: placeholder developer data
    // The team, in order. photo: a square image in public/team/. If it's missing (or fails to load),
    // the card shows the initials instead.
    this.team = [
      { name: 'Nicholas Vocatura', initials: 'NV', role: 'Backend', photo: '/team/nick.png', linkedin: 'https://www.linkedin.com/in/nicholas-vocatura/', github: 'https://github.com/nick11255' },
      { name: 'Antonio Feng', initials: 'AF', role: 'Backend', photo: '/team/tony.png', linkedin: 'https://www.linkedin.com/in/antonio-feng/', github: 'https://github.com/porpol' },
      { name: 'Gregory Courtney', initials: 'GC', role: 'Fullstack', photo: '/team/greg.png', linkedin: 'https://www.linkedin.com/in/greg-courtney/', github: 'https://github.com/gregco7' },
      { name: 'Ethan Chilel', initials: 'EC', role: 'Frontend', photo: '/team/ethan.png', linkedin: 'https://www.linkedin.com/in/ethan-chilel', github: 'https://github.com/Ethanchilel' },
    ];
    this.footerCols = [
      { title: 'Product', links: [['How it works', '#how'], ['For Founders', '#founders'], ['For Accelerators', '#accelerators'], ['Demo', '/map']] },
      { title: 'Company', links: [['About', '#about'], ['Careers', '#about'], ['Contact', '#about'], ['Press', '#about']] },
      { title: 'Resources', links: [['Worked examples', '/map'], ['Pillar guide', '#slab-b'], ['Changelog', '#top'], ['Status', '#top']] },
      { title: 'Legal', links: [['Privacy', '#top'], ['Terms', '#top'], ['Security', '#top'], ['Cookies', '#top']] },
    ].map(c => ({ title: c.title, links: c.links.map(([label, href]) => ({ label, href })) }));
    this.challenges = [
      ['Who exactly pays — the student or the parent?', 82, 71],
      ['Is “no time to cook” the real problem, or budget?', 76, 80],
      ['Dorm kitchens are shared by 40+ people', 58, 39],
      ['Weekly kits need cold-chain logistics', 64, 52],
      ['Three funded competitors launched this year', 41, 33],
      ['Campus partnerships cap reach to 12 schools', 71, 63],
      ['$8/month is below delivery cost per order', 52, 44],
      ['Food-safety liability on shared pickup', 38, 46],
    ];
    this.tabDefs = [['How it works', 'how'], ['Research', 'slab-a'], ['Challenge', 'slab-b'], ['Founders', 'founders']];
  }

  componentDidMount() {
    this.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reduced) this.setState({ step: 4, filled: true, gIdx: 2 });
    else { this.runLoop(); this.bT0 = setTimeout(() => this.renderVals().burst(), 700); }
    this.onScroll = () => {
      const hero = document.getElementById('hero');
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (window.scrollY - 20) / 200)), pastHero = r.bottom < 0;
      const mid = window.innerHeight * 0.4;
      let active = 0;
      this.tabDefs.forEach(([, id], i) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= mid) active = i; });
      if (Math.abs(prog - (this.state.prog || 0)) > 0.01 || pastHero !== this.state.pastHero || active !== this.state.active) this.setState({ prog, scrolled: prog > 0.98, pastHero, active });
    };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();
    const footer = document.getElementById('footer');
    this.ioF = new IntersectionObserver(es => this.setState({ footerIn: es[0].isIntersecting }), { threshold: 0.05 });
    footer && this.ioF.observe(footer);
    const slab = document.getElementById('slab-a-card');
    if (slab) { this.ioA = new IntersectionObserver(es => { if (es[0].isIntersecting) { this.setState({ filled: true }); this.ioA.disconnect(); } }, { threshold: 0.4 }); this.ioA.observe(slab); }
  }
  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll);
    [this.ioF, this.ioA].forEach(o => o && o.disconnect());
    (this.timers || []).forEach(clearTimeout);
    clearInterval(this.gTimer);
    clearInterval(this.fTimer);
    clearTimeout(this.bT0); clearTimeout(this.bT1); clearTimeout(this.bT2);
  }
  runLoop() {
    const seq = [[1, 400], [2, 3600], [3, 7200], [4, 11000], [0, 15800]];
    const tick = () => {
      this.timers = seq.map(([st, t]) => setTimeout(() => this.setState({ step: st }), t));
      this.timers.push(setTimeout(tick, 17000));
    };
    tick();
    this.gTimer = setInterval(() => this.setState(st => ({ gIdx: (st.gIdx + 1) % 8 })), 2600);
    this.fTimer = setInterval(() => this.setState(st => ({ fIdx: (st.fIdx || 0) + 1 })), 2800);
    setTimeout(() => this.setState({ gIdx: 0 }), 600);
  }

  renderVals() {
    const { step, filled, scrolled, pastHero, footerIn, active } = this.state;
    const pillars = this.P.map(p => {
      const on = step >= 1;
      const pct = !on ? 0 : p.i === 2 ? (step === 3 ? 39 : step >= 4 ? 74 : p.basePct) : p.basePct;
      const hot = p.i === 2 && step >= 3;
      return { ...p, pct, color: this.col(pct || 1), offset: (238.76 * (1 - pct / 100)).toFixed(1), op: on ? 1 : 0, scale: on ? 1 : .6,
        stroke: hot ? this.col(pct) : '#B9D4C4', sw: hot ? 1.5 : 1, delay: on ? p.delay : '0s', count: p.i === 2 ? (step >= 4 ? 4 : step >= 3 ? 3 : p.count) : p.count };
    });
    const pills = this.pillsBase.map((c, i) => {
      const on = step >= 2, st = step <= 2 ? 0 : step === 3 ? 1 : 2, dot = c.state[st];
      const lead = step >= 4 ? i === 2 : i === 0;
      return { ...c, dot, op: on ? 1 : 0, slide: on ? '0px' : '-20px', delay: on ? c.delay : '0s', fill: lead ? '#F5F7F2' : '#fff', stroke: lead ? dot : '#B9D4C4', ev: i === 0 ? (step >= 3 ? '2 ev' : '1 ev') : i === 2 ? (step >= 4 ? '1 ev' : '0 ev') : '0 ev' };
    });
    const cards = this.cardsBase.map(k => {
      const vis = step >= k.at, fresh = step === k.at;
      return { ...k, op: vis ? 1 : 0, slide: vis ? '0px' : '28px', delay: vis ? '.3s' : '0s', stroke: fresh ? k.accent : '#B9D4C4' };
    });
    const edges = this.edges.map(e => { const vis = step >= e.at; return { ...e, off: vis ? 0 : 1, op: vis ? e.base : 0, delay: vis ? e.delay : '0s' }; });
    const gIdx = this.state.gIdx;
    const grid = this.P.map(p => {
      const ch = this.challenges[p.i], hit = p.i === gIdx, done = gIdx >= 0 && p.i < gIdx;
      const pct = hit || done ? ch[2] : ch[1];
      return { ...p, gPct: pct, gColor: this.col(pct), gOffset: (219.9 * (1 - pct / 100)).toFixed(1), gScale: hit ? 1.08 : 1, gOp: gIdx < 0 || hit || done ? 1 : .55, gStroke: hit ? this.col(pct) : '#B9D4C4' };
    });
    const gCh = gIdx >= 0 ? this.challenges[gIdx] : null;
    const stories = [
      ['Describe', '00', 'Idea: “An $8/month meal planner for students”'],
      ['Research', '01', 'Reading 14 sources… eight pillars scored'],
      ['Map', '02', 'Solution branches into 3 choices · Weekly meal kits leads'],
      ['Challenge', '03', '“Dorm kitchens are shared by 40+” · Solution 58 → 39 · meal kits fail'],
      ['Pivot', '04', 'Campus pickup promoted · 3 cafés on board · Solution 39 → 74'],
    ][step];
    const variant = this.props.headline ?? 'guess';
    const h1 = variant === 'mapped' ? ['Your idea, mapped —', 'then pressure-tested.', ''] : ['Every idea starts as a seed.', 'Watch yours', 'sprout.'];
    const bursting = !!this.state.burst && !this.state.burstFade;
    const leafTr = bursting ? 'transform .9s cubic-bezier(.22,1,.36,1), opacity .7s ease' : (this.state.burstFade ? 'opacity .5s ease' : 'none');
    const leafCols = ['#2E9E5B', '#4CC27E', '#B9D4C4', '#0F2E20'];
    const leaves = Array.from({ length: 10 }, (_, k) => {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2 + (k % 2 ? .18 : -.12);
      const R = bursting ? 58 + (k % 3) * 14 : 0;
      const fade = !!this.state.burstFade, Rf = fade ? 78 + (k % 3) * 16 : R;
      return { c: leafCols[k % 4], x: (Math.cos(a) * Rf).toFixed(1) + 'px', y: (Math.sin(a) * Rf * .8).toFixed(1) + 'px', r: ((bursting || fade) ? 45 + k * 36 : 0) + 'deg', s: (bursting || fade) ? (.55 + (k % 3) * .2).toFixed(2) : '0', op: bursting ? 1 : 0, tr: fade ? 'transform 1.1s ease-out, opacity .6s ease' : leafTr };
    });
    const barOn = this.props.showFeatureBar ?? true;
    const barVisible = pastHero && !footerIn;
    const tabs = this.tabDefs.map(([label, id], i) => ({
      label, bg: i === active ? '#0F2E20' : 'transparent', fg: i === active ? '#F2F5F3' : '#4A5E53', dot: i === active ? '#0F2E20' : '#B9D4C4',
      go: () => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: this.reduced ? 'auto' : 'smooth' }); },
    }));
    return {
      ann: this.state.ann && (this.props.showAnnouncement ?? true),
      dismiss: () => this.setState({ ann: false }),
      navOp: 1 - (this.state.prog || 0), navY: (-(this.state.prog || 0) * 16).toFixed(1) + 'px', navPe: scrolled ? 'none' : 'auto',
      h1a: h1[0], h1b: h1[1], h1c: h1[2], leaves,
      sproutScale: bursting && !this.state.burstFade ? 1.06 : 1, sproutBright: bursting && !this.state.burstFade ? 1.25 : 1,
      burst: () => {
        if (this.state.burst && !this.state.burstFade) return;
        clearTimeout(this.bT1); clearTimeout(this.bT2);
        this.setState({ burst: false, burstFade: false });
        this.bT1 = setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => this.setState({ burst: true }))), 30);
        this.bT2 = setTimeout(() => this.setState({ burstFade: true }), 950);
      },
      edges, pillars, pills, cards, grid,
      gDot: gCh ? this.col(gCh[2]) : '#B9D4C4', gCaption: gCh ? gCh[0] + ' · ' + gCh[1] + ' → ' + gCh[2] : 'Running challenges…',
      pulseR: step === 0 ? 30 : 110, pulseOp: step === 0 ? .9 : 0,
      progress: ['4%', '28%', '52%', '76%', '100%'][step],
      stepLabel: stories[0], stepNum: stories[1] + ' / 04', statusText: stories[2],
      feed: (() => { const pool = this.feedPool || (this.feedPool = [...this.evidenceBase,
          { accent: '#4CC27E', l1: 'Grocery delivery to campus up 31% since 2023', l2: 'Regional retail data · Week 2', tag: 'FOR', w1: '74%', w2: '50%' },
          { accent: '#F26D6D', l1: 'Average student food budget is $62 a week', l2: 'Financial aid office survey · Week 3', tag: 'AGAINST', w1: '68%', w2: '40%' },
          { accent: '#F2B441', l1: 'Two meal-kit startups shut down campus pilots in 2024', l2: 'Press archive · Week 4', tag: 'AGAINST', w1: '80%', w2: '56%' },
          { accent: '#4CC27E', l1: 'Residence halls add induction cooktops in 3 new buildings', l2: 'Facilities plan · Week 4', tag: 'FOR', w1: '66%', w2: '46%' },
        ]); const n = pool.length, i = this.state.fIdx || 0, ROW = 52;
        return pool.map((e, j) => { const pos = (i - j + n * 4) % n;
          if (pos < 4) return { ...e, y: (pos * ROW) + 'px', op: 1 };
          if (pos === n - 1) return { ...e, y: '-28px', op: 0 };
          return { ...e, y: (4 * ROW + 16) + 'px', op: 0 }; }); })(),
      feedCount: 14 + (this.state.fIdx || 0),
      evidence: this.evidenceBase.map((e, i) => ({ ...e, textOp: filled ? 1 : 0, sk: filled ? 0 : 1, d1: (i * .12).toFixed(2) + 's', d2: (i * .12 + .08).toFixed(2) + 's' })),
      aboutCopy: this.aboutCopy, team: this.team, footerCols: this.footerCols,
      barOn, tabs, barY: barVisible ? '0px' : '24px', barOp: barVisible ? 1 : 0, barPe: barVisible ? 'auto' : 'none',
    };
  }
}

export default Component;
