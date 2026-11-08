// Logic for the Projects screen, from the Claude Design file "Projects.dc.html".
// Changes from the design: page links point at app routes, keyframe names carry the "pj-" prefix,
// colors come from the Sprout theme variables, and the list is the account's saved ideas
// (src/lib/db: Supabase for accounts, browser storage for guests). No canned project.
// App addition: each card has a remove control. The first click asks inline (no browser dialog);
// confirming animates the card out, drops it from the list and calls ideaStore().remove().
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
import { Session } from "@/session";
import { ideaStore, weekOf } from "@/lib/db";
const PILLARS = ['Customer','Problem','Solution','Approach','Edge','Reach','Revenue','Risks'];
// Same thresholds as the map and the landing page: strong ≥ 70%, mixed ≥ 45%, weak below.
const confColor = v => v >= .70 ? 'var(--green)' : v >= .45 ? 'var(--amber)' : 'var(--red)';
const confBg = v => v >= .70 ? 'var(--green-tint)' : v >= .45 ? 'var(--amber-tint)' : 'var(--red-tint)';
// Small text ("62% ready") uses the darker -text shades so it stays readable on the tint.
const confText = v => v >= .70 ? 'var(--green-text)' : v >= .45 ? 'var(--amber-text)' : 'var(--red-text)';
const planted = t => { const d = new Date(t); return d.toDateString() === new Date().toDateString() ? 'Planted today' : 'Planted ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
class Component extends DCLogic {
  // App change: wait for the session to load (real auth is async) before the sign-in check.
  // Runs again each time the page is shown, so a just-planted idea appears.
  async componentDidMount() {
    const S = Session; await S.ready(); const s = S.getSession();
    if (!s) { location.replace('/login'); return; }
    this.setState({ session: s });
    try { this.setState({ saved: await ideaStore().list() }); }
    catch (err) { console.error('[sessions] list', err); this.setState({ saved: [] }); }
    this.onKey = e => { if (e.key === 'Escape' && this.state.confirmId) this.cancelRemove(); };
    window.addEventListener('keydown', this.onKey);
  }
  componentWillUnmount() { if (this.onKey) window.removeEventListener('keydown', this.onKey); }
  // ---- remove flow ----
  askRemove(id) { this.setState({ confirmId: id }); }
  cancelRemove() { this.setState({ confirmId: null }); }
  async confirmRemove(id) {
    const store = ideaStore();
    // Let the card animate out before it leaves the grid (matches pj-cardOut in projects.css).
    this.setState({ confirmId: null, leavingId: id });
    await new Promise(r => setTimeout(r, 240));
    this.setState(prev => ({ leavingId: null, saved: (prev.saved || []).filter(x => x.id !== id) }));
    try { await store.remove(id); }
    catch (err) {
      console.error('[sessions] remove', err);
      // The delete didn't land: put the real list back rather than lie about it.
      try { this.setState({ saved: await store.list() }); } catch {}
    }
  }
  renderVals() {
    const s = this.state.session || Session.getSession() || { name: 'Guest', mode: 'full' };
    const saved = (this.state.saved || []).map(x => ({ id: x.id, name: x.title || (x.description || '').slice(0, 60) || 'Untitled idea', description: x.description, week: weekOf(x.updatedAt, x.createdAt), scores: x.pillarScores && x.pillarScores.length === 8 ? x.pillarScores : PILLARS.map(() => 0), edited: planted(x.createdAt), href: `/map?id=${encodeURIComponent(x.id)}` }));
    const projects = saved.map((p, i) => {
      const avg = p.scores.reduce((a, b) => a + b, 0) / p.scores.length;
      return { ...p, title: p.name, meta: `Week ${p.week} · ${p.edited}`, delay: (i * .06) + 's', readiness: Math.round(avg * 100), pillBg: confBg(avg), pillFg: confText(avg), pillDot: confColor(avg),
        confirming: this.state.confirmId === p.id, leaving: this.state.leavingId === p.id,
        bars: p.scores.map((v, k) => ({ h: Math.round(v * 100) + '%', color: confColor(v), title: PILLARS[k] + ' ' + Math.round(v * 100) + '%' })) };
    });
    return {
      name: s.name, initial: (s.name || 'G').charAt(0).toUpperCase(), isDemo: s.mode === 'demo',
      logout: () => { Session.logout().finally(() => { location.href = '/login'; }); },
      projects,
      askRemove: id => this.askRemove(id), cancelRemove: () => this.cancelRemove(), confirmRemove: id => this.confirmRemove(id),
    };
  }
}

export default Component;
