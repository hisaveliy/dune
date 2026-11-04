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
  timelineVersion: 3,
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
export function timeline(version = 3) {
  const a = [];

  for (let r = 1; r <= 10; r++) {
    for (let p = 0; p < 9; p++) {
      if ([4, 5, 7].includes(p) || version < 2 && p === 2) {
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
      } else if (p === 3 && version < 3) {
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
export function migrateTimeline() {
  if (state.g.timelineVersion === 3) return;
  const previous = timeline(state.g.timelineVersion ?? 1)[state.g.cursor];
  state.g.cursor = timeline().findIndex(s => s.r === previous.r && s.p === previous.p && ([2, 3].includes(s.p) || s.part === previous.part && s.f === previous.f));
  state.g.timelineVersion = 3;
}
export function skipInitialRevival() {
  const s = current();
  if (s.r !== 1 || s.p !== 4 || state.g.values['r1p4-opened']) return;
  state.g.values['r1p4-skip-from'] = s.f;
  state.g.cursor = timeline().findIndex(x => x.r === 1 && x.p === 5);
  state.g.round = 1;
  state.g.phase = 5;
}
export function step(delta) {
  settle();
  const s = current();
  if (s.r === 1 && s.p === 4 && delta === 1) delete state.g.values['r1p4-skip-from'];
  let next = state.g.cursor + delta,
      a = timeline();
  if (delta === -1 && s.r === 1 && s.p === 5 && s.part === 'ship' && s.f === state.g.selected[0] && state.g.values['r1p4-skip-from']) {
    next = a.findIndex(x => x.r === 1 && x.p === 4 && x.f === state.g.values['r1p4-skip-from']);
  }
  if (next < 0) return;

  if (next >= a.length) {
    state.g.finished = true;
    state.g.active = null;
    state.g.startedAt = null;
    state.page = 'ended';
  } else {
    state.g.cursor = next;
    if (delta < 0 && current().r === 1 && current().p === 4) state.g.values['r1p4-opened'] = true;
    if (delta > 0) skipInitialRevival();
    let s = current();
    state.g.round = s.r;
    state.g.phase = s.p;
    state.page = s.p === 9 ? 'stats' : 'play';
    state.shownRound = s.r;
    activate();
  }

  persist();
}
export function skipRevival() {
  const s = current();
  if (s.r !== 1 || s.p !== 4) return;
  state.g.values['r1p4-skip-from'] = s.f;
  const next = timeline().findIndex(x => x.r === 1 && x.p === 5);
  step(next - state.g.cursor);
}
export function setupList() {
  const hasIxians = state.g.selected.includes('Ixians');
  let a = [['general-board', 'Поле, банк спайса, фишки и ширмы подготовлены.'], ['general-storm', 'Подготовить стартовое положение бури.'], ['general-traitor-deck', 'Подготовить колоду Traitor Cards: убрать карты всех неучаствующих фракций, оставить карты участвующих фракций, включая своих лидеров, и перемешать. До раздачи выполнить стартовые действия из пунктов Traitor Cards выбранных фракций.'], ['general-spice', 'Подготовить две стопки Spice Deck.']];
  if (state.g.modules.discovery) a.push(['general-discovery', 'Подготовить Discovery Tokens.']);
  if (state.g.modules.stronghold) a.push(['general-strongholds', 'Подготовить Stronghold Cards.']);
  if (state.g.modules.tech) a.push(['general-tech', 'Подготовить Tech Tokens.']);

  for (const f of state.g.selected) {
    const x = startingSetup[f];
    a.push([f + '-spice', 'Получить ' + x.spice + ' стартового спайса из банка.']);
    a.push([f + '-placement', x.placement]);
    a.push([f + '-reserve', 'Подготовить резерв: ' + x.reserve + ' войск (на поле: ' + x.field + ').']);
    let traitors = 'Получить 4 Traitor Cards из подготовленной общей колоды, тайно выбрать и оставить 1 карту за ширмой. Остальные 3 вернуть лицом вниз под низ колоды. Можно оставить чужого лидера как предателя или своего, чтобы защитить его от предательства.';
    if (f === 'Harkonnen') traitors = 'Получить 4 Traitor Cards при общей раздаче и тайно оставить все 4 за ширмой, включая карты своих лидеров. В отличие от обычной раздачи, выбирать одну и возвращать остальные не нужно.';
    if (f === 'Tleilaxu') traitors = 'Не получать обычные 4 Traitor Cards. После того как остальные фракции выбрали предателей и вернули невыбранные карты, перемешать оставшуюся общую колоду и тайно взять 3 верхние карты. Все 3 оставить за ширмой как Face Dancers, а не обычных предателей. Карты лидеров Тлейлаксу из общей колоды не убираются.';
    if (f === 'Ecaz' && state.g.advanced) traitors = 'Loyalty · до общей раздачи: случайно выбрать одну Traitor Card своей фракции и отложить открыто перед всеми на всю партию; она не попадает в общую колоду. Перемешать колоду после этого действия. Затем: ' + traitors;
    if (f === 'CHOAM') traitors = (state.g.advanced ? 'До общей раздачи: подготовить диск лидера Auditor и замешать его Traitor Card в общую колоду. Затем: ' : 'В Basic Auditor не используется: убрать его Traitor Card из колоды до общей раздачи. Затем: ') + traitors;
    a.push([f + '-traitors', traitors]);
    let treachery;
    if (f === 'Ixians') {
      treachery = 'Получить 1 стартовую Treachery Card в руку: перед общей раздачей возьмите ' + state.g.selected.length + ' карт из колоды (по одной на участвующую фракцию), выберите одну себе, остальные карты перемешайте и раздайте по одной другим игрокам.';
    } else if (f === 'Harkonnen') {
      treachery = 'Получить 2 стартовые Treachery Cards в руку' + (hasIxians ? ': одну из раздачи Иксиан, затем ещё одну возьмите сверху общей колоды.' : ' из общей колоды.');
    } else {
      treachery = 'Получить 1 стартовую Treachery Card в руку ' + (hasIxians ? 'из раздачи Иксиан.' : 'из общей колоды.');
      if (f === 'Richese') treachery += ' Отдельный запас из 10 специальных карт Richese не входит в стартовую руку.';
    }
    a.push([f + '-treachery', treachery]);
    if (x.special) a.push([f + '-special', x.special]);
  }

  return a;
}
export function migrateTreacherySetup() {
  if (!('general-treachery' in state.g.checks)) return;
  for (const f of state.g.selected) state.g.checks[f + '-treachery'] ??= state.g.checks['general-treachery'];
  delete state.g.checks['general-treachery'];
}
export function migrateTraitorSetup() {
  const checks = state.g.checks, dealt = checks['general-traitors'];
  if (dealt !== undefined) checks['general-traitor-deck'] ??= dealt;
  for (const f of state.g.selected) {
    const oldSpecial = ['Harkonnen', 'Tleilaxu'].includes(f) ? f + '-special' : null;
    const completed = oldSpecial && oldSpecial in checks ? checks[oldSpecial] : dealt;
    if (completed !== undefined) checks[f + '-traitors'] ??= completed;
    if (oldSpecial) delete checks[oldSpecial];
  }
  delete checks['general-traitors'];
}
export function activate() {
  let s = current();
  state.g.active = s && s.p !== 9 && !state.g.finished ? key(s) : null;
  state.g.startedAt = state.g.active && !state.g.paused ? Date.now() : null;
}
