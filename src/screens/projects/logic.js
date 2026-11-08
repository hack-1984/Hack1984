// Logic for the Projects screen, from the Claude Design file "Projects.dc.html".
// Changes from the design: page links point at app routes, keyframe names carry the "pj-" prefix,
// colors come from the Sprout theme variables, and ideas planted in this browser are listed
// ahead of the Pantry demo.
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
import { Session } from "@/session";
import { listIdeas } from "@/ideas/store";
import { ideaPillarScores } from "@/ideas/toMap";
// Pantry mirrors the map's built-in demo. Pillar scores are the week-6 averages shown on the map.
const PILLARS = ['Customer','Problem','Solution','Approach','Edge','Reach','Revenue','Risks'];
const PROJECTS = [
  { id: 'pantry', name: 'Pantry', description: 'A $8/month meal-planning app for college students on tight budgets.', week: 6, scores: [.82, .76, .58, .64, .7, .52, .6, .38], edited: 'Edited this week', href: '/map' },
];
// Same thresholds as the map: strong ≥ 75%, mixed ≥ 45%, weak below.
const confColor = v => v >= .75 ? 'var(--green)' : v >= .45 ? 'var(--amber)' : 'var(--red)';
const confBg = v => v >= .75 ? 'var(--green-tint)' : v >= .45 ? 'var(--amber-tint)' : 'var(--red-tint)';
// Small text ("62% ready") uses the darker -text shades so it stays readable on the tint.
const confText = v => v >= .75 ? 'var(--green-text)' : v >= .45 ? 'var(--amber-text)' : 'var(--red-text)';
const planted = t => { const d = new Date(t); return d.toDateString() === new Date().toDateString() ? 'Planted today' : 'Planted ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
class Component extends DCLogic {
  // App change: wait for the session to load (real auth is async) before the sign-in check.
  // Runs again each time the page is shown, so a just-planted idea appears.
  async componentDidMount() {
    const S = Session; await S.ready(); const s = S.getSession();
    if (!s) { location.replace('/login'); return; }
    this.setState({ session: s, saved: listIdeas() });
  }
  renderVals() {
    const s = this.state.session || Session.getSession() || { name: 'Guest', mode: 'full' };
    const saved = (this.state.saved || []).map(x => ({ id: x.id, name: x.name, description: x.description, week: 1, scores: ideaPillarScores(x.idea), edited: planted(x.createdAt), href: `/map?id=${encodeURIComponent(x.id)}` }));
    const projects = [...saved, ...PROJECTS].map((p, i) => {
      const avg = p.scores.reduce((a, b) => a + b, 0) / p.scores.length;
      return { ...p, title: p.name, meta: `Week ${p.week} · ${p.edited}`, delay: (i * .06) + 's', readiness: Math.round(avg * 100), pillBg: confBg(avg), pillFg: confText(avg), pillDot: confColor(avg),
        bars: p.scores.map((v, k) => ({ h: Math.round(v * 100) + '%', color: confColor(v), title: PILLARS[k] + ' ' + Math.round(v * 100) + '%' })) };
    });
    return {
      name: s.name, initial: (s.name || 'G').charAt(0).toUpperCase(), isDemo: s.mode === 'demo',
      logout: () => { Session.logout().finally(() => { location.href = '/login'; }); },
      projects,
    };
  }
}

export default Component;
