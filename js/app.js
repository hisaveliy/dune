import { state } from "./state.js";
import { home, saved } from "./screens/home.js";
import { create, settings, setup } from "./screens/setup.js";
import { play } from "./screens/play.js";
import { ended, statistics } from "./screens/statistics.js";
import { settle, spent, phaseMs, fmt } from "./timers.js";
import { copy, persist } from "./storage.js";
import { activate, current, fresh, key, step } from "./game.js";
import { v } from "./ui.js";
const el = document.getElementById('app');

function updateClocks(el) {
  if (state.page !== 'play' || !state.g) return;
  let s = current(),
      a = el.querySelector('[data-clock=step]'),
      b = el.querySelector('[data-clock=phase]');
  if (a) a.textContent = fmt(s.f ? spent(key(s)) : phaseMs(s.r, s.p));
  if (b) b.textContent = fmt(phaseMs(s.r, s.p));
}

function render() {
  switch (state.page) {
    case 'home':
      el.innerHTML = home();
      break;

    case 'saved':
      el.innerHTML = saved();
      break;

    case 'create':
      el.innerHTML = create();
      break;

    case 'settings':
      el.innerHTML = settings();
      break;

    case 'setup':
      el.innerHTML = setup();
      break;

    case 'play':
      el.innerHTML = play();
      break;

    case 'stats':
      el.innerHTML = statistics();
      break;

    case 'ended':
      el.innerHTML = ended();
      break;
  }

  updateClocks(el);
}

el.addEventListener('click', evt => {
  let b = evt.target.closest('button');
  if (!b) return;

  if (b.dataset.faction) {
    let f = b.dataset.faction,
        i = state.g.selected.indexOf(f);
    if (i >= 0 && state.g.selected.length > 2) state.g.selected.splice(i, 1);else if (i < 0 && state.g.selected.length < 6) state.g.selected.push(f);
    persist();
    render();
    return;
  }

  if (b.dataset.order !== undefined) {
    let i = +b.dataset.order,
        j = i + +b.dataset.shift;
    if (j >= 0 && j < state.g.selected.length) [state.g.selected[i], state.g.selected[j]] = [state.g.selected[j], state.g.selected[i]];
    persist();
    render();
    return;
  }

  if (b.dataset.prep) {
    state.prepTab = b.dataset.prep;
    render();
    return;
  }

  if (b.dataset.tab) {
    state.tab = b.dataset.tab;
    render();
    return;
  }

  if (b.dataset.load) {
    state.g = copy(state.library.find(z => z.id === b.dataset.load));

    if (state.g.started && !state.g.finished) {
      state.page = current().p === 9 ? 'stats' : 'play';
      activate();
    } else state.page = state.g.finished ? 'ended' : 'setup';

    persist();
    render();
    return;
  }

  if (b.dataset.number) {
    let k = b.dataset.number;
    state.g.values[k] = Math.min(Number(b.dataset.max || 100), Math.max(0, Number(v(k, 0)) + Number(b.dataset.delta)));
    persist();
    render();
    return;
  }

  switch (b.dataset.action) {
    case 'new':
      state.g = fresh();
      state.prepTab = 'general';
      state.page = 'create';
      persist();
      render();
      break;

    case 'saved':
      state.page = 'saved';
      render();
      break;

    case 'home':
      settle();

      if (state.g && state.g.active) {
        state.g.paused = true;
        state.g.startedAt = null;
      }

      persist();
      state.page = 'home';
      render();
      break;

    case 'create':
      state.page = 'create';
      render();
      break;

    case 'settings':
      state.page = 'settings';
      state.g.checks.advanced = state.g.advanced;
      state.g.checks.alliances = state.g.alliances;

      for (let k of Object.keys(state.g.modules)) state.g.checks['module-' + k] = state.g.modules[k];

      render();
      break;

    case 'setup':
      state.page = 'setup';
      render();
      break;

    case 'start':
      state.g.started = true;
      state.g.cursor = 0;
      state.g.paused = false;
      state.page = 'play';
      activate();
      persist();
      render();
      break;

    case 'next':
      step(1);
      render();
      break;

    case 'back':
      step(-1);
      render();
      break;

    case 'pause':
      settle();
      state.g.paused = !state.g.paused;
      state.g.startedAt = state.g.paused ? null : Date.now();
      persist();
      render();
      break;
  }
});
el.addEventListener('change', evt => {
  let x = evt.target;
  if (!state.g) return;

  if (x.dataset.check) {
    state.g.checks[x.dataset.check] = x.checked;
    if (x.dataset.check === 'advanced') state.g.advanced = x.checked;
    if (x.dataset.check === 'alliances') state.g.alliances = x.checked;
    if (x.dataset.check.startsWith('module-')) state.g.modules[x.dataset.check.slice(7)] = x.checked;
    persist();
    render();
    return;
  }

  if (x.dataset.value) {
    state.g.values[x.dataset.value] = x.value;
    persist();
    render();
    return;
  }

  if (x.dataset.player) {
    state.g.playerNames[x.dataset.player] = x.value;
    persist();
  }
});
el.addEventListener('input', evt => {
  let x = evt.target;

  if (state.g && x.dataset.player) {
    state.g.playerNames[x.dataset.player] = x.value;
    persist();
  }
});
setInterval(() => {
  if (state.g && state.g.started && !state.g.paused && state.g.active) {
    settle();
    persist();
  }

  updateClocks(el);
}, 1000);
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
