import { current } from "../game.js";
import { fmt, phaseMs, playerMs, roundMs, total } from "../timers.js";
import { state } from "../state.js";
import { esc, note, select, v } from "../ui.js";
import { N, P } from "../data.js";
export function statistics() {
  let r = current().r,
      rounds = Array.from({
    length: r
  }, (_, i) => i + 1),
      max = Math.max(...rounds.map(roundMs), 1);
  return `<header><div class="ey">DUNE COMPANION · STATISTICS</div><h2 style="margin:6px 0">Итоги раунда ${r}</h2><div class="muted">Просмотр статистики не увеличивает игровое время.</div></header><div class="body"><div class="grid"><div class="metric"><span class="small">Вся партия</span><b>${fmt(total())}</b></div><div class="metric"><span class="small">Раунд ${r}</span><b>${fmt(roundMs(r))}</b></div></div><div class="tabs">${[['rounds', 'Раунды'], ['phases', 'Фазы'], ['players', 'Игроки']].map(([id, l]) => `<button class="${state.tab === id ? 'active' : ''}" data-tab="${id}">${l}</button>`).join('')}</div>${state.tab === 'rounds' ? rounds.map(n => `<div class="panel"><div class="row"><strong>Раунд ${n}</strong><span>${fmt(roundMs(n))}</span></div><div class="bar"><div style="width:${100 * roundMs(n) / max}%"></div></div></div>`).join('') : state.tab === 'phases' ? `${select('stats-round', rounds.map(n => [n, 'Раунд ' + n]), r)}<table><thead><tr><th>Фаза</th><th>Время</th></tr></thead><tbody>${P.map((p, i) => `<tr><td>${p}</td><td>${fmt(phaseMs(Number(v('stats-round', r)), i))}</td></tr>`).join('')}</tbody></table>` : `<table><thead><tr><th>Игрок</th><th>Время</th></tr></thead><tbody>${state.g.selected.map(f => `<tr><td>${esc(state.g.playerNames[f] || N[f])}</td><td>${fmt(playerMs(f))}</td></tr>`).join('')}</tbody></table>${note('Общие фазы не входят в персональную статистику игроков.')}`}${note('Возвращение на предыдущий шаг возобновляет его секундомер без обнуления.')}</div><div class="footer"><div class="nav"><button class="button" data-action="back">← Mentat</button><button class="button primary" data-action="next">${r === 10 ? 'Итог партии' : 'Раунд ' + (r + 1)} →</button></div></div>`;
}
export function ended() {
  return `<header><div class="ey">THE SPICE MUST FLOW</div><h2>Партия завершена</h2><div class="timer">${fmt(total())}</div></header><div class="body"><div class="section">Личное время за партию</div>${state.g.selected.map(f => `<div class="panel row"><strong>${N[f]}</strong><span>${fmt(playerMs(f))}</span></div>`).join('')}${note('Проверьте окончательный результат и особые победные условия на поле.')}<button class="button" data-action="back">← Итоги раунда</button><button class="button primary" data-action="home">На главную</button></div>`;
}
