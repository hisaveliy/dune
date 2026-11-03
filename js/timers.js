import { state } from "./state.js";
import { P } from "./data.js";
export function settle() {
  if (state.g?.active && !state.g.paused && state.g.startedAt) {
    state.g.elapsed[state.g.active] = (state.g.elapsed[state.g.active] || 0) + Math.max(0, Date.now() - state.g.startedAt);
    state.g.startedAt = Date.now();
  }
}
export const spent = k => (state.g.elapsed[k] || 0) + (state.g.active === k && !state.g.paused && state.g.startedAt ? Math.max(0, Date.now() - state.g.startedAt) : 0);
export const keys = () => new Set([...Object.keys(state.g.elapsed), ...(state.g.active ? [state.g.active] : [])]);
export const phaseMs = (r, p) => [...keys()].filter(k => k.startsWith(r + '|' + p + '|')).reduce((a, k) => a + spent(k), 0);
export const roundMs = r => P.reduce((n, _, i) => n + phaseMs(r, i), 0);
export const playerMs = f => [...keys()].filter(k => k.split('|')[2] === f).reduce((a, k) => a + spent(k), 0);
export const total = () => Array.from({
  length: 10
}, (_, i) => roundMs(i + 1)).reduce((a, b) => a + b, 0);
export const fmt = ms => {
  let n = Math.floor(Math.max(0, ms) / 1000);
  return [Math.floor(n / 3600), Math.floor(n % 3600 / 60), n % 60].map(v => String(v).padStart(2, '0')).join(':');
};
