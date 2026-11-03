import { spiceBlow } from "./spice-blow.js";
import { charity, inflationMentat } from "./charity.js";
import { bidding } from "./bidding.js";
import { allExtra, c, check, counter, esc, extra, note, panel, select, v } from "../ui.js";
import { N, P, free } from "../data.js";
import { state } from "../state.js";
import { current, key } from "../game.js";
import { fmt, phaseMs, spent } from "../timers.js";
export function phaseContent(s) {
  let base = 'r' + s.r + 'p' + s.p,
      f = s.f;
  if (s.p === 0) return panel('Storm', `<p>Переместите бурю и примените последствия, затем определите первого игрока по полю.</p>${check(base + '-storm', 'Буря перемещена; последствия разрешены.')}${allExtra(0)}`);

  if (s.p === 1) return spiceBlow(s);

  if (s.p === 2) return charity(s.r);

  if (s.p === 3) return bidding(s);

  if (s.p === 4) {
    let id = base + f,
        num = Number(v(id + '-troops', 0)),
        limit = free[f];
    return `<h2>${N[f]}</h2>${panel('Revival', `<div class="grid"><div class="metric"><b>${limit}</b><span class="small">Бесплатных войск</span></div><div class="metric"><b>${f === 'Fremen' ? limit : 3}</b><span class="small">Стандартный предел*</span></div></div><div class="section">Воскресить войск</div>${counter(id + '-troops', 0, f === 'Fremen' ? limit : 3)}${note('Базовая цена: ' + (f === 'Fremen' ? 0 : Math.max(0, num - limit) * 2) + ' спайса. *Способности, союзники и карты могут менять расчёт. Для Фременов обычная платная докупка не предусмотрена.')}${check(id + '-leader', 'Лидеры, элитные войска и исключения проверены.')}${check(id + '-done', 'Revival завершён.')}`)}${extra(f, 4)}`;
  }

  if (s.p === 5) {
    let id = base + f;

    if (s.part === 'ship') {
      let n = Number(v(id + '-count', 0)),
          dest = v(id + '-destination', 'hold');
      let cost = f === 'Fremen' ? 'специальная бесплатная высадка' : Math.ceil(n * (dest === 'hold' ? 1 : 2) * (f === 'Guild' ? .5 : 1)) + ' спайса (базово)';
      return `<h2>${N[f]}</h2>${panel('Shipment', `<p>Территория высадки:</p>${select(id + '-destination', [['hold', 'Крепость'], ['other', 'Другая территория']], 'hold')}<div class="section">Количество войск</div>${counter(id + '-count', 0, 20)}${note('Цена: ' + cost + '. Учитывайте специальные виды высадки, No-Field, союзников и ограничения поля.')}${check(id + '-ship', 'Высадка завершена или пропущена.')}`)}${extra(f, 5)}`;
    }

    return `<h2>${N[f]}</h2>${panel('Movement', `<p>Движение обычно бесплатно. Проверьте дальность, орнитоптеры, бурю и специальные способности.</p>${check(id + '-move', 'Перемещение завершено или пропущено.')}`)}${extra(f, 5)}`;
  }

  if (s.p === 6) {
    let a = v(base + '-a', state.g.selected[0]),
        b = v(base + '-b', state.g.selected.find(f => f !== a));
    return panel('Battle', `<p>Выберите две фракции. После сражения можете выбрать другую пару; таймер продолжается для всей фазы.</p>${select(base + '-a', state.g.selected.map(f => [f, N[f]]), state.g.selected[0])}<div style="text-align:center;color:var(--gold)">VS</div>${select(base + '-b', state.g.selected.filter(f => f !== a).map(f => [f, N[f]]), state.g.selected.find(f => f !== a))}${extra(a, 6)}${extra(b === a ? state.g.selected.find(f => f !== a) : b, 6)}${note('Проверить Traitor, Weapon/Defense, оплату боевой силы, Karama и последствия боя. Скрытые карты вводить не требуется.')}${check(base + '-done', 'Все сражения завершены.')}`);
  }

  if (s.p === 7) {
    let id = base + f,
        arr = c(id + '-arr'),
        car = c(id + '-car'),
        tuek = c(id + '-tuek'),
        rate = arr || car ? 3 : 2,
        n = Number(v(id + '-troops', 0)),
        available = Number(v(id + '-available', 0)),
        gain = Math.min(rate * n, available),
        income = state.g.advanced ? (arr ? 2 : 0) + (car ? 2 : 0) + (tuek ? 1 : 0) : 0;
    return `<h2>${N[f]}</h2>${panel('Spice Collection', `<p>Расчёт для одного сектора. Доход крепостей начисляйте только один раз за фазу.</p>${check(id + '-arr', 'Контроль Arrakeen')}${check(id + '-car', 'Контроль Carthag')}${check(id + '-tuek', 'Контроль Tuek’s Sietch')}<div class="section">Войска в секторе</div>${counter(id + '-troops', 0, 20)}<div class="section">Доступный спайс</div>${counter(id + '-available', 0, 30)}<div class="grid"><div class="metric"><b>${gain}</b><span class="small">Собрано · ${rate} за войско</span></div><div class="metric"><b>+${income}</b><span class="small">Доход крепостей</span></div></div>${note('Сумма по одному сектору и доходу крепостей: ' + (gain + income) + '. В других секторах не добавляйте доход крепостей второй раз.')}${check(id + '-done', 'Весь сбор спайса завершён.')}`)}${extra(f, 7)}`;
  }

  if (s.p === 8) {
    let type = v(base + '-victory', 'none');
    return panel('Mentat Pause', `<p>Проверьте контроль крепостей и модули. Не объявляйте победу по одному лишь числу без проверки условий.</p>${select(base + '-victory', [['none', 'Обычной победы нет'], ['solo', 'Одиночная победа'], ['alliance', 'Победа альянса'], ['ecaz', 'Особая союзная победа Ecaz'], ['unclear', 'Спорная / одновременная победа']], 'none')}${type !== 'none' ? select(base + '-winner', state.g.selected.map(f => [f, N[f]]), state.g.selected[0]) : ''}${s.r === 10 ? note('10-й раунд: проверьте специальную победу Фременов, затем Гильдии и порядок разрешения исключений.') : ''}<div class="section">Проверки фракций</div>${allExtra(8)}${inflationMentat(s.r)}${state.g.modules.discovery ? check(base + '-discovery', 'Дополнительные крепости Discovery проверены.') : ''}${state.g.modules.stronghold ? check(base + '-strong', 'Stronghold Cards проверены.') : ''}${state.g.modules.tech ? check(base + '-tech', 'Tech Tokens проверены.') : ''}${check(base + '-general', 'Все применимые проверки завершены.')}`);
  }

  return '';
}
export function play() {
  let s = current(),
      personal = !!s.f;
  return `<header><div class="row"><span class="ey">DUNE COMPANION · GAME MASTER</span><span class="tag">${state.g.paused ? 'ПАУЗА' : '● ИГРА'}</span></div><div class="row" style="margin-top:12px"><div><span class="small">РАУНД</span><h3>${s.r} / 10</h3></div><div style="text-align:right"><span class="small">ФАЗА ${s.p + 1} / 9</span><h3>${P[s.p]}</h3></div></div><div class="track">${P.map((_, i) => `<i class="${i === s.p ? 'now' : i < s.p ? 'done' : ''}"></i>`).join('')}</div></header><div class="body"><div class="row"><span class="ey">${personal ? 'ХОД ИГРОКА' : s.part === 'A' || s.part === 'B' ? 'СТОПКА ' + s.part : 'ОБЩАЯ ФАЗА'}</span><button class="tinybtn" data-action="pause">${state.g.paused ? '▶ Продолжить' : 'Ⅱ Пауза'}</button></div>${personal ? `<h2 style="margin-top:10px">${N[s.f]}</h2><div class="muted">${esc(state.g.playerNames[s.f] || '')} ${s.part === 'ship' ? '· Shipment' : s.part === 'move' ? '· Movement' : ''}</div>` : ''}<div class="${personal ? 'timers' : ''}">${personal ? `<div class="timerPanel"><div class="small">ВРЕМЯ ФАЗЫ</div><div class="timer" data-clock="phase">${fmt(phaseMs(s.r, s.p))}</div></div>` : ''}<div class="timerPanel"><div class="small">${personal ? 'ВРЕМЯ ИГРОКА' : 'ВРЕМЯ ФАЗЫ'}</div><div class="timer" data-clock="step">${fmt(personal ? spent(key(s)) : phaseMs(s.r, s.p))}</div><div class="small">${state.g.paused ? 'Остановлен' : '● Активен'}</div></div></div>${phaseContent(s)}<button class="subtle" data-action="home">Главная · сохранить прогресс</button></div><div class="footer"><div class="nav"><button class="button" data-action="back" ${state.g.cursor === 0 ? 'disabled' : ''}>← Назад</button><button class="button primary" data-action="next">${s.p === 8 ? 'Статистика раунда' : 'Далее'} →</button></div></div>`;
}
