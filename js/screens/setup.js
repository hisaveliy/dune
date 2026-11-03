import { F, N, startingSetup } from "../data.js";
import { state } from "../state.js";
import { c, check, esc, foot, note, panel, toggle } from "../ui.js";
import { setupList } from "../game.js";
export function create() {
  return `<div class="top"><button class="subtle" data-action="home">← Главная</button><strong>Создание игры</strong></div><div class="body"><h2>Выбор домов</h2><p class="muted">От 2 до 6 фракций.</p><div class="grid">${F.map(f => `<button class="choice ${state.g.selected.includes(f) ? 'active' : ''}" data-faction="${f}">${N[f]} ${state.g.selected.includes(f) ? '✓' : ''}</button>`).join('')}</div><div class="section">Порядок хода</div>${state.g.selected.map((f, i) => `<div class="panel"><div class="row"><strong>${i + 1}. ${N[f]}</strong><div><button class="tinybtn" data-order="${i}" data-shift="-1" ${i === 0 ? 'disabled' : ''}>↑</button> <button class="tinybtn" data-order="${i}" data-shift="1" ${i === state.g.selected.length - 1 ? 'disabled' : ''}>↓</button></div></div><input class="field" data-player="${f}" placeholder="Имя игрока (необязательно)" value="${esc(state.g.playerNames[f] || '')}"></div>`).join('')}</div>${foot('Настройки', 'settings')}`;
}
export function settings() {
  return `<div class="top"><button class="subtle" data-action="create">← Назад</button><strong>Настройки</strong></div><div class="body"><h2>Правила партии</h2>${toggle('advanced', 'Advanced Rules')}${toggle('alliances', 'Альянсы')}<div class="section">Модули</div>${['discovery', 'stronghold', 'tech'].map(n => toggle('module-' + n, {
    discovery: 'Discovery Tokens',
    stronghold: 'Stronghold Cards',
    tech: 'Tech Tokens'
  }[n])).join('')}${note('Время не ограничивается: секундомеры отсчитывают продолжительность фаз и отдельных ходов.')}</div>${foot('Подготовка', 'setup')}`;
}
export function setup() {
  let a = setupList(),
      done = a.filter(t => c(t[0])).length,
      rows = a.filter(t => state.prepTab === 'general' ? t[0].startsWith('general-') : t[0].startsWith(state.prepTab + '-'));
  return `<div class="top"><button class="subtle" data-action="settings">← Назад</button><strong>Preparation</strong></div><div class="body"><h2>Подготовка</h2><div class="muted">Готово ${done} / ${a.length}</div><div class="bar"><div style="width:${100 * done / a.length}%"></div></div><div class="tabs">${[['general', 'Общая'], ...state.g.selected.map(f => [f, N[f]])].map(([id, l]) => `<button class="${state.prepTab === id ? 'active' : ''}" data-prep="${id}">${l}</button>`).join('')}</div>${state.prepTab === 'general' ? '' : `<div class="grid"><div class="metric"><span class="small">Стартовый спайс</span><b>${startingSetup[state.prepTab].spice}</b></div><div class="metric"><span class="small">На поле / резерв</span><b>${startingSetup[state.prepTab].field} / ${startingSetup[state.prepTab].reserve}</b></div></div>`}${panel(state.prepTab === 'general' ? 'Общая подготовка' : N[state.prepTab], rows.map(t => check(...t)).join(''))}${note('Числа и формулировки основаны на рабочей матрице подготовки; особые условия и исключения сверяйте с официальными правилами перед партией.')}</div>${foot('Начать игру', 'start', done !== a.length)}`;
}
