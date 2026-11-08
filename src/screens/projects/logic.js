// Logic for the Projects screen, verbatim from the Claude Design file "Projects.dc.html".
// Only changes: page links point at app routes, keyframe names carry the "pj-" prefix,
// and anything noted inline below.
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
import { Session } from "@/session";
import { ideaStore } from "@/lib/db";
// App change: the list comes from the store (Supabase for accounts, browser
// storage for guests). No canned projects.
const PILLARS = ['Customer','Problem','Solution','Approach','Edge','Reach','Revenue','Risks'];
const DAY = 86400000;
const edited = (t) => { const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? 'Edited today' : d === 1 ? 'Edited yesterday' : d < 7 ? 'Edited this week' : d < 30 ? 'Edited this month' : 'Edited ' + new Date(t).toLocaleDateString(); };
const confColor = v => v >= .75 ? '#15803d' : v >= .45 ? '#eab308' : '#dc2626';
const confText = v => v >= .75 ? '#15803d' : v >= .45 ? '#a16207' : '#b91c1c';
const confBg = v => v >= .75 ? '#dcfce7' : v >= .45 ? '#fef9c3' : '#fee2e2';
class Component extends DCLogic {
  // App change: wait for the session to load (real auth is async) before the sign-in check.
  async componentDidMount() {
    const S = Session; await S.ready(); const s = S.getSession();
    if (!s) { location.replace('/login'); return; }
    this.setState({ session: s });
    try { this.setState({ list: await ideaStore().list() }); }
    catch (err) { console.error('[sessions] list', err); this.setState({ list: [] }); }
  }
  renderVals() {
    const s = this.state.session || Session.getSession() || { name: 'Guest', mode: 'full' };
    const projects = (this.state.list || []).map((p, i) => {
      const scores = p.pillarScores && p.pillarScores.length === 8 ? p.pillarScores : PILLARS.map(() => 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const desc = p.description || '';
      return { id: p.id, title: p.title || desc.slice(0, 60) || 'Untitled idea', subtitle: desc.length > 90 ? desc.slice(0, 90) + '…' : desc, edited: edited(p.updatedAt), href: '/map?id=' + encodeURIComponent(p.id),
        delay: (i * .06) + 's', readiness: Math.round(avg * 100), pillBg: confBg(avg), pillFg: confText(avg),
        bars: scores.map((v, k) => ({ h: Math.round(v * 100) + '%', color: confColor(v), title: PILLARS[k] + ' ' + Math.round(v * 100) + '%' })) };
    });
    return {
      name: s.name, initial: (s.name || 'G').charAt(0).toUpperCase(), isDemo: s.mode === 'demo',
      logout: () => { Session.logout().finally(() => { location.href = '/login'; }); },
      projects,
    };
  }
}

export default Component;
