import { state } from "./state.js";
export const store = 'dune_companion_release_1';

try {
  state.library = JSON.parse(localStorage.getItem(store) || '[]');
} catch {}

if (!Array.isArray(state.library)) state.library = [];
export const copy = v => JSON.parse(JSON.stringify(v));
export function persist() {
  if (!state.g) return;
  let i = state.library.findIndex(x => x.id === state.g.id);
  if (i < 0) state.library.push(copy(state.g));else state.library[i] = copy(state.g);

  try {
    localStorage.setItem(store, JSON.stringify(state.library));
  } catch {}
}
