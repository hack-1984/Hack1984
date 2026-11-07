// Logic for the Projects screen, verbatim from the Claude Design file "Projects.dc.html".
// Only changes: page links point at app routes, keyframe names carry the "pj-" prefix,
// and anything noted inline below.
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
import { Session } from "@/session";
// Project list mirrors the main screen's store (Pantry). Pillar scores are the
// week-6 averages shown on the map; replace with a shared store when one exists.
const PILLARS = ['Customer','Problem','Solution','Approach','Edge','Reach','Revenue','Risks'];
const PROJECTS = [
  { id: 'pantry', title: 'A $8/month meal-planning app for college students on tight budgets.', subtitle: 'Pantry · week 6', scores: [.82, .76, .58, .64, .7, .52, .6, .38], edited: 'Edited this week', href: '/map' },
];
const confColor = v => v >= .75 ? '#15803d' : v >= .45 ? '#eab308' : '#dc2626';
const confText = v => v >= .75 ? '#15803d' : v >= .45 ? '#a16207' : '#b91c1c';
const confBg = v => v >= .75 ? '#dcfce7' : v >= .45 ? '#fef9c3' : '#fee2e2';
class Component extends DCLogic {
  // App change: wait for the session to load (real auth is async) before the sign-in check.
  async componentDidMount() {
    const S = Session; await S.ready(); const s = S.getSession();
    if (!s) { location.replace('/login'); return; }
    this.setState({ session: s });
  }
  renderVals() {
    const s = this.state.session || Session.getSession() || { name: 'Guest', mode: 'full' };
    const projects = PROJECTS.map((p, i) => {
      const avg = p.scores.reduce((a, b) => a + b, 0) / p.scores.length;
      return { ...p, delay: (i * .06) + 's', readiness: Math.round(avg * 100), pillBg: confBg(avg), pillFg: confText(avg),
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
