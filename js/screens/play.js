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
  if (s.p === 0) {
    const hasFremen = state.g.selected.includes('Fremen');
    const stormCards = hasFremen && state.g.advanced;
    let movement;
    if (s.r === 1) {
      movement = panel('Первый раунд · боевые диски', `<ol>
        <li>Поставьте маркер бури в сектор Storm Start.</li>
        <li>Два игрока, чьи маркеры ближайшие к Storm Start с двух сторон, тайно выставляют на боевых дисках по числу от 0 до 20.</li>
        <li>Одновременно откройте числа, сложите их и передвиньте бурю от Storm Start против часовой стрелки на полученное число секторов.</li>
      </ol>${note('Первую бурю всегда определяют дисками, в том числе при участии Фременов в Advanced.')}`);
    } else if (stormCards) {
      movement = panel('Карта бури · Advanced с Фременами', `<ol>
        <li>Раскройте Storm Card, которую Фремены случайно взяли и отложили в предыдущем раунде.</li>
        <li>Передвиньте бурю от текущего положения против часовой стрелки на число секторов, указанное на карте. Боевые диски для определения расстояния сейчас не используются.</li>
        <li>Верните раскрытую карту в Storm Deck.</li>
      </ol>${note('Это установленный порядок, а не выбор между картой и дисками. Фремены не выбирают нужное число: их преимущество — заранее знать случайно взятую карту.')}`);
    } else {
      movement = panel('Движение бури · боевые диски', `<ol>
        <li>Два игрока, которые последними использовали боевые диски, независимо и тайно выставляют по числу от 1 до 3.</li>
        <li>Одновременно откройте числа и сложите их: получится от 2 до 6 секторов.</li>
        <li>Передвиньте бурю от текущего положения против часовой стрелки на это число секторов.</li>
      </ol>${note(hasFremen ? 'Выбраны Basic Rules: фракционная колода Storm Cards не используется, даже если Фремены участвуют.' : 'Фременов в партии нет: движение бури определяется боевыми дисками.')}`);
    }
    const prepare = stormCards && s.r < 10 ? panel('Фремены · Подготовка карты на раунд ' + (s.r + 1), `<p>После текущего движения бури перемешайте Storm Deck. Фремены случайно берут одну Storm Card, тайно смотрят её и кладут лицом вниз у края поля. Эта карта определит движение бури в раунде ${s.r + 1}; сейчас по ней бурю повторно не двигайте.</p>`) : '';
    return panel('Storm', `
      ${note('Storm Deck — отдельная колода карт бури Фременов. Общая Spice Deck используется в следующей фазе Spice Blow: это разные колоды.')}
      ${movement}
      ${panel('Последствия и порядок хода', `<ol>
        <li>Во всех секторах, через которые буря прошла или где остановилась, уберите спайс в банк. Войска в песчаных территориях отправьте в Tanks, кроме Imperial Basin. Войска в непесчаных территориях защищены от бури.</li>
        <li>Сектор под бурей блокирует обычное движение в него, из него и через него. Сражение невозможно, если участвующие войска находятся под бурей.</li>
        <li>Первый игрок — тот, чей маркер буря следующим встретит, если продолжит двигаться против часовой стрелки. Определяйте его по маркерам вокруг поля.</li>
      </ol>${stormCards ? note('В Advanced Фремены теряют от бури только половину затронутых войск, округляя потери вверх. Это не разрешает им обычное движение или поездку на черве в сектор под бурей либо из него.') : ''}`)}
      ${prepare}
      ${note('Карты и другие специальные эффекты, меняющие движение или защиту от бури, применяйте в указанный ими момент.')}
      ${allExtra(0)}`);
  }

  if (s.p === 1) return spiceBlow(s);

  if (s.p === 2) return charity(s.r);

  if (s.p === 3) return bidding(s);

  if (s.p === 4) {
    let id = base + f,
        num = Number(v(id + '-troops', 0)),
        limit = free[f];
    const skip = s.r === 1 ? panel('Первый раунд', `
      ${note('Если в Tanks некого воскрешать и эффекты конца фазы разрешены, можно сразу перейти к Shipment & Movement. При потерях от бури или других событий проведите Revival обычным образом.')}
      ${state.g.selected.includes('Ecaz') ? note('Ecaz могут разместить послов в конце Revival даже без воскрешений. Перед пропуском разместите послов или откажитесь от этой возможности.') : ''}
      <button class="button" data-action="skip-revival">Пропустить Revival →</button>`) : '';
    return `${skip}<h2>${N[f]}</h2>${panel('Revival', `<div class="grid"><div class="metric"><b>${limit}</b><span class="small">Бесплатных войск</span></div><div class="metric"><b>${f === 'Fremen' ? limit : 3}</b><span class="small">Стандартный предел*</span></div></div><div class="section">Воскресить войск</div>${counter(id + '-troops', 0, f === 'Fremen' ? limit : 3)}${note('Базовая цена: ' + (f === 'Fremen' ? 0 : Math.max(0, num - limit) * 2) + ' спайса. *Способности, союзники и карты могут менять расчёт. Для Фременов обычная платная докупка не предусмотрена.')}${check(id + '-leader', 'Лидеры, элитные войска и исключения проверены.')}`)}${extra(f, 4)}`;
  }

  if (s.p === 5) {
    let id = base + f;

    if (s.part === 'ship') {
      const prescience = f === state.g.selected[0] && state.g.selected.includes('Atreides') ? panel('Атрейдесы · до действий первого игрока',
        check(base + '-prescience', 'В начале Shipment & Movement, до действий первого игрока, Атрейдесы могут посмотреть верхнюю карту Spice Deck.')
        + note('Предвидение показывает только одну карту, в том числе при Double Spice Blow.')) : '';
      let n = Number(v(id + '-count', 0)),
          dest = v(id + '-destination', 'hold');
      const landing = f === 'Fremen' ? `<p>Фремены могут бесплатно высадить часть или весь резерв в Great Flat либо в одну любую территорию на расстоянии не более двух территорий от Great Flat. За одну высадку выбирается одна территория. Расстояние считается по территориям, а не по секторам.</p>` : `<p>Территория высадки:</p>${select(id + '-destination', [['hold', 'Крепость'], ['other', 'Другая территория']], 'hold')}`;
      const cost = f === 'Fremen' ? 0 : Math.ceil(n * (dest === 'hold' ? 1 : 2) * (f === 'Guild' ? .5 : 1));
      const payment = f === 'Fremen' ? 'Оплата не требуется · бесплатная высадка' : state.g.selected.includes('Guild') && f !== 'Guild' ? 'Оплата: Гильдии' : 'Оплата: в банк спайса';
      const priceCard = `<div class="timerPanel" aria-label="Стоимость высадки"><div class="small">ЦЕНА ВЫСАДКИ${f === 'Fremen' ? '' : ' · БАЗОВАЯ'}</div><div class="timer"><output data-shipment-cost>${cost}</output> спайса</div><p>${payment}</p></div>`;
      const restrictions = f === 'Fremen' ? 'Соблюдайте ограничения присутствия фракций. ' + (state.g.advanced ? 'В Advanced разрешена высадка в допустимый сектор под бурей: отправьте в Tanks половину высаживаемых войск, округляя потери вверх. Это исключение не разрешает обычное движение под бурей.' : 'В Basic высадка в сектор под бурей запрещена.') : 'Учитывайте специальные виды высадки, No-Field, союзников и ограничения поля.';
      return `${prescience}<h2>${N[f]}</h2>${panel('Shipment', `${landing}<div class="section">Количество войск</div>${counter(id + '-count', 0, 20)}${priceCard}${note(restrictions)}`)}${extra(f, 5)}`;
    }

    return `<h2>${N[f]}</h2>${panel('Movement', `<p>Движение обычно бесплатно. Проверьте дальность, орнитоптеры, бурю и специальные способности.</p>`)}${extra(f, 5)}`;
  }

  if (s.p === 6) {
    let a = v(base + '-a', state.g.selected[0]),
        b = v(base + '-b', state.g.selected.find(f => f !== a));
    return panel('Battle', `<p>Выберите две фракции. После сражения можете выбрать другую пару; таймер продолжается для всей фазы.</p>${select(base + '-a', state.g.selected.map(f => [f, N[f]]), state.g.selected[0])}<div style="text-align:center;color:var(--gold)">VS</div>${select(base + '-b', state.g.selected.filter(f => f !== a).map(f => [f, N[f]]), state.g.selected.find(f => f !== a))}${extra(a, 6)}${extra(b === a ? state.g.selected.find(f => f !== a) : b, 6)}${note('Проверить Traitor, Weapon/Defense, оплату боевой силы, Karama и последствия боя. Скрытые карты вводить не требуется.')}`);
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
    return `<h2>${N[f]}</h2>${panel('Spice Collection', `<p>Расчёт для одного сектора. Доход крепостей начисляйте только один раз за фазу.</p>${check(id + '-arr', 'Контроль Arrakeen')}${check(id + '-car', 'Контроль Carthag')}${check(id + '-tuek', 'Контроль Tuek’s Sietch')}<div class="section">Войска в секторе</div>${counter(id + '-troops', 0, 20)}<div class="section">Доступный спайс</div>${counter(id + '-available', 0, 30)}<div class="grid"><div class="metric"><b>${gain}</b><span class="small">Собрано · ${rate} за войско</span></div><div class="metric"><b>+${income}</b><span class="small">Доход крепостей</span></div></div><div class="timerPanel" aria-label="Полученный спайс"><div class="small">ВСЕГО ПОЛУЧЕНО</div><div class="timer"><output data-collection-total>${gain + income}</output> спайса</div><div class="small">Сбор в этом секторе + доход крепостей</div></div>${note('В других секторах не добавляйте доход крепостей второй раз.')}`)}${extra(f, 7)}`;
  }

  if (s.p === 8) {
    let type = v(base + '-victory', 'none');
    const factionChecks = state.g.selected.filter(faction => faction !== 'Fremen' || s.r === 10).map(faction => extra(faction, 8)).join('');
    return panel('Mentat Pause', `<p>Проверьте контроль крепостей и модули. Не объявляйте победу по одному лишь числу без проверки условий.</p>${select(base + '-victory', [['none', 'Обычной победы нет'], ['solo', 'Одиночная победа'], ['alliance', 'Победа альянса'], ['ecaz', 'Особая союзная победа Ecaz'], ['unclear', 'Спорная / одновременная победа']], 'none')}${type !== 'none' ? select(base + '-winner', state.g.selected.map(f => [f, N[f]]), state.g.selected[0]) : ''}${s.r === 10 ? note('10-й раунд: проверьте специальную победу Фременов, затем Гильдии и порядок разрешения исключений.') : ''}${factionChecks ? `<div class="section">Проверки фракций</div>${factionChecks}` : ''}${inflationMentat(s.r)}${state.g.modules.discovery ? panel('Discovery · проверка победы', check(base + '-discovery', 'Учтите занятую Jacurutu Sietch при подсчёте крепостей.') + note('Раскрытая Jacurutu Sietch считается обычной крепостью. Для победы учитываются войска внутри самой локации; войск только в её родительской территории недостаточно. Остальные Discovery-локации крепостями не считаются. Если Jacurutu не раскрыта или не занята, добавлять крепость никому не нужно.')) : ''}${state.g.modules.stronghold ? panel('Stronghold Cards · владельцы карт', check(base + '-strong', 'Передайте карты крепостей текущим контролирующим фракциям.') + note('В Mentat Pause, начиная с первого раунда, проверьте контроль каждой крепости и передайте её карту контролирующей фракции. Советниц Bene Gesserit при определении контроля не учитывайте. Если крепость никто не контролирует, отложите карту. Карты дают свойства в боях за соответствующие крепости; отдельной крепостью для победы сама карта не считается.')) : ''}${state.g.modules.tech ? panel('Tech Tokens · проверка победы', check(base + '-tech', 'Учтите полный комплект Tech Tokens как одну дополнительную крепость.') + note('Если один игрок контролирует все три Tech Token — Axlotl Tanks, Heighliners и Spice Production — это считается одной дополнительной крепостью для победы. Жетоны двух союзников складывать нельзя: все три должны быть у одного игрока. Если полного комплекта ни у кого нет, дополнительная крепость не засчитывается.')) : ''}`);
  }

  return '';
}
export function play() {
  let s = current(),
      personal = !!s.f;
  return `<header><div class="row"><span class="ey">DUNE COMPANION · GAME MASTER</span><span class="tag">${state.g.paused ? 'ПАУЗА' : '● ИГРА'}</span></div><div class="row" style="margin-top:12px"><div><span class="small">РАУНД</span><h3>${s.r} / 10</h3></div><div style="text-align:right"><span class="small">ФАЗА ${s.p + 1} / 9</span><h3>${P[s.p]}</h3></div></div><div class="track">${P.map((_, i) => `<i class="${i === s.p ? 'now' : i < s.p ? 'done' : ''}"></i>`).join('')}</div></header><div class="body"><div class="row"><span class="ey">${personal ? 'ХОД ИГРОКА' : s.part === 'A' || s.part === 'B' ? 'СТОПКА ' + s.part : 'ОБЩАЯ ФАЗА'}</span><button class="tinybtn" data-action="pause">${state.g.paused ? '▶ Продолжить' : 'Ⅱ Пауза'}</button></div>${personal ? `<h2 style="margin-top:10px">${N[s.f]}</h2><div class="muted">${esc(state.g.playerNames[s.f] || '')} ${s.part === 'ship' ? '· Shipment' : s.part === 'move' ? '· Movement' : ''}</div>` : ''}<div class="${personal ? 'timers' : ''}">${personal ? `<div class="timerPanel"><div class="small">ВРЕМЯ ФАЗЫ</div><div class="timer" data-clock="phase">${fmt(phaseMs(s.r, s.p))}</div></div>` : ''}<div class="timerPanel"><div class="small">${personal ? 'ВРЕМЯ ИГРОКА' : 'ВРЕМЯ ФАЗЫ'}</div><div class="timer" data-clock="step">${fmt(personal ? spent(key(s)) : phaseMs(s.r, s.p))}</div><div class="small">${state.g.paused ? 'Остановлен' : '● Активен'}</div></div></div>${phaseContent(s)}<button class="subtle" data-action="home">Главная · сохранить прогресс</button></div><div class="footer"><div class="nav"><button class="button" data-action="back" ${state.g.cursor === 0 ? 'disabled' : ''}>← Назад</button><button class="button primary" data-action="next">${s.p === 8 ? 'Статистика раунда' : 'Далее'} →</button></div></div>`;
}
