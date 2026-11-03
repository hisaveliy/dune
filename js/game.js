import { state } from "./state.js";
import { settle } from "./timers.js";
import { persist } from "./storage.js";
import { startingSetup } from "./data.js";
export const fresh = () => ({
  id: 'g' + Date.now(),
  created: Date.now(),
  selected: ['Fremen', 'Atreides', 'Ecaz', 'Moritani', 'CHOAM'],
  playerNames: {},
  advanced: true,
  alliances: true,
  modules: {
    discovery: true,
    stronghold: true,
    tech: true
  },
  checks: {},
  values: {},
  timelineVersion: 2,
  cursor: 0,
  started: false,
  finished: false,
  paused: false,
  active: null,
  startedAt: null,
  elapsed: {},
  round: 1,
  phase: 0
});
export function timeline(legacyCharity = false) {
  const a = [];

  for (let r = 1; r <= 10; r++) {
    for (let p = 0; p < 9; p++) {
      if ([4, 5, 7].includes(p) || legacyCharity && p === 2) {
        for (const f of state.g.selected) {
          if (p === 5) {
            a.push({
              r,
              p,
              f,
              part: 'ship'
            });
            a.push({
              r,
              p,
              f,
              part: 'move'
            });
          } else a.push({
            r,
            p,
            f,
            part: 'main'
          });
        }
      } else if (p === 1) {
        a.push({
          r,
          p,
          part: 'A'
        });
        a.push({
          r,
          p,
          part: 'B'
        });
      } else if (p === 3) {
        a.push({
          r,
          p,
          part: 'prepare'
        });
        a.push({
          r,
          p,
          part: 'auction'
        });
      } else a.push({
        r,
        p,
        part: 'main'
      });
    }

    a.push({
      r,
      p: 9,
      part: 'statistics'
    });
  }

  return a;
}
export const current = () => timeline()[state.g.cursor];
export const key = x => [x.r, x.p, x.f || 'shared', x.part].join('|');
export function migrateCharityTimeline() {
  if (state.g.timelineVersion === 2) return;
  const previous = timeline(true)[state.g.cursor];
  state.g.cursor = timeline().findIndex(s => s.r === previous.r && s.p === previous.p && s.part === previous.part && (s.p === 2 || s.f === previous.f));
  state.g.timelineVersion = 2;
}
export function step(delta) {
  settle();
  let next = state.g.cursor + delta,
      a = timeline();
  if (next < 0) return;

  if (next >= a.length) {
    state.g.finished = true;
    state.g.active = null;
    state.g.startedAt = null;
    state.page = 'ended';
  } else {
    state.g.cursor = next;
    let s = current();
    state.g.round = s.r;
    state.g.phase = s.p;
    state.page = s.p === 9 ? 'stats' : 'play';
    state.shownRound = s.r;
    activate();
  }

  persist();
}
export function setupList() {
  const exceptions = [];
  if (state.g.selected.includes('Harkonnen')) exceptions.push('исключение Харконненов');
  if (state.g.selected.includes('Ixians')) exceptions.push('исключение Иксиан');
  const treachery = 'Раздать стартовые Treachery Cards' + (exceptions.length ? ', учитывая ' + exceptions.join(' и ') : '') + '.';
  let a = [['general-board', 'Поле, банк спайса, фишки и ширмы подготовлены.'], ['general-storm', 'Подготовить стартовое положение бури.'], ['general-traitors', 'Раздать Traitor Cards с учётом исключений фракций.'], ['general-treachery', treachery], ['general-spice', 'Подготовить две стопки Spice Deck.']];
  if (state.g.modules.discovery) a.push(['general-discovery', 'Подготовить Discovery Tokens.']);
  if (state.g.modules.stronghold) a.push(['general-strongholds', 'Подготовить Stronghold Cards.']);
  if (state.g.modules.tech) a.push(['general-tech', 'Подготовить Tech Tokens.']);

  for (const f of state.g.selected) {
    const x = startingSetup[f];
    a.push([f + '-spice', 'Получить ' + x.spice + ' стартового спайса из банка.']);
    a.push([f + '-placement', x.placement]);
    a.push([f + '-reserve', 'Подготовить резерв: ' + x.reserve + ' войск (на поле: ' + x.field + ').']);
    a.push([f + '-special', x.special]);
  }

  return a;
}
export function activate() {
  let s = current();
  state.g.active = s && s.p !== 9 && !state.g.finished ? key(s) : null;
  state.g.startedAt = state.g.active && !state.g.paused ? Date.now() : null;
}
