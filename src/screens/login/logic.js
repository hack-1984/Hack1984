// Logic for the Login screen, verbatim from the Claude Design file "Login.dc.html".
// Only changes: page links point at app routes, keyframe names carry the "lg-" prefix,
// and anything noted inline below.
/* eslint-disable */
import React from "react";
import { DCLogic } from "../dc";
import { Session } from "@/session";
class Component extends DCLogic {
  state = { email: '', password: '', error: null };
  go() { location.href = '/sessions'; }
  // App change: the session API is async (real auth), so wait for it and surface failures.
  run(fn) { this.setState({ error: null }); return fn().then(s => { if (s) this.go(); }, err => this.setState({ error: (err && err.message) || 'Something went wrong. Try again.' })); }
  renderVals() {
    const S = Session; // design: window.Session
    const P = ['Customer','Problem','Solution','Approach','Edge','Reach','Revenue','Risks'];
    const V = [.82, .76, .58, .64, .7, .52, .6, .38];
    const col = v => v >= .75 ? '#15803d' : v >= .45 ? '#eab308' : '#dc2626';
    const treeNodes = P.map((name, i) => { const a = -Math.PI / 2 + i * Math.PI / 4; const x = 300 + Math.cos(a) * 230, y = 300 + Math.sin(a) * 230; return { name, x: x.toFixed(1), y: y.toFixed(1), fx: (x - 30).toFixed(1), fy: (y - 30).toFixed(1), color: col(V[i]), delay: (.4 + i * .08).toFixed(2) + 's' }; });
    const host = location.hostname;
    return {
      email: this.state.email, password: this.state.password,
      setEmail: e => this.setState({ email: e.target.value }), setPassword: e => this.setState({ password: e.target.value }),
      submit: e => { e.preventDefault(); this.run(() => S.login(this.state.email, this.state.password)); },
      google: () => { this.run(() => S.loginWithGoogle(this.state.email)); },
      create: () => { this.run(() => S.signUp(this.state.email, this.state.password)); },
      guest: () => { this.run(() => S.loginAsGuest()); },
      // App change: the "any password works" notice only shows when running on the local stub.
      isDev: S.backend === 'local' && (host === 'localhost' || host === '127.0.0.1'),
      error: this.state.error,
      treeNodes,
    };
  }
}

export default Component;
