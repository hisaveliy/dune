import { state } from "../state.js";
import { note } from "../ui.js";
import { N } from "../data.js";
export function home() {
  return `<header><div class="ey">THE SPICE MUST FLOW</div><h1>DUNE</h1><div class="ey">COMPANION · PLAYABLE BUILD</div><p style="color:#ead2b5">Цифровой ведущий для Арракиса</p></header><div class="body"><button class="button primary" data-action="new">＋ Создать партию</button><button class="button" data-action="saved">Продолжить · ${state.library.length}</button>${note('Автосохранение · 12 фракций · Advanced · 9 фаз · секундомеры · статистика. Работа без интернета после загрузки.')}</div>`;
}
export function saved() {
  return `<div class="top"><button class="subtle" data-action="home">← Главная</button><strong>Сохранённые партии</strong></div><div class="body">${state.library.length ? [...state.library].sort((a, b) => b.created - a.created).map(z => `<button class="button" style="text-align:left" data-load="${z.id}">${new Date(z.created).toLocaleString('ru-RU')}<div class="muted">${z.selected.map(f => N[f]).join(' · ')}</div><span class="small">${z.finished ? 'Завершена' : z.started ? 'Раунд ' + z.round : 'Подготовка'}</span></button>`).join('') : '<p>Пока нет сохранённых игр.</p>'}</div>`;
}
