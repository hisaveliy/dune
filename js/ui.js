import { state } from "./state.js";
import { N, ability } from "./data.js";
export const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
export const v = (id, fallback) => state.g.values[id] ?? fallback;
export const c = id => !!state.g.checks[id];
export const check = (id, txt) => `<label class="check"><input type="checkbox" data-check="${esc(id)}" ${c(id) ? 'checked' : ''}><span class="${c(id) ? 'completed' : ''}">${txt}</span></label>`;
export const toggle = (id, txt) => `<label class="check"><input type="checkbox" data-check="${esc(id)}" ${c(id) ? 'checked' : ''}><span>${txt}</span></label>`;
export const select = (id, opts, d, label) => `<select class="field" data-value="${esc(id)}"${label ? ` aria-label="${esc(label)}"` : ''}>${opts.map(([x, t]) => `<option value="${esc(x)}" ${String(v(id, d)) === String(x) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
export const counter = (id, d, maximum) => `<div class="counter"><button class="tinybtn" data-number="${esc(id)}" data-delta="-1">−</button><b>${v(id, d)}</b><button class="tinybtn" data-number="${esc(id)}" data-delta="1" data-max="${maximum}">+</button></div>`;
export const panel = (title, txt) => `<div class="panel">${title ? `<div class="section" style="margin-top:0">${title}</div>` : ''}${txt}</div>`;
export const note = s => `<div class="note">${s}</div>`;
export const extra = (f, p) => ability[f]?.[p] ? `<div class="rule"><strong>${N[f]}</strong><div class="muted">${ability[f][p]}</div>${p === 8 ? check('r' + state.g.round + '-mentat-' + f, 'Проверено / выполнено или неприменимо') : ''}</div>` : '';
export const allExtra = p => state.g.selected.map(f => extra(f, p)).join('');
export const foot = (label, act, disabled = false) => `<div class="footer"><button class="button primary" data-action="${act}" ${disabled ? 'disabled' : ''}>${label} →</button></div>`;
