import { boardPositions } from "../positions.js";
import { fortStatus, homeworldStatus } from "./positions.js";
import { N } from "../data.js";
import { roundOrder } from "../game.js";
import { state } from "../state.js";
import { accordion, counter, esc, extra, note, panel, select, v } from "../ui.js";

function sectorKey(id, index) {
  return index === 0 ? id : `${id}-sector-${index + 1}`;
}

export function resizeCollection(round, faction, delta) {
  const id = `r${round}p7${faction}`;
  const count = v(id + '-sector-count', 1);
  const next = Math.max(1, Math.min(20, count + delta));
  state.g.values[id + '-sector-count'] = next;
  if (next < count) {
    const removed = sectorKey(id, next);
    delete state.g.values[removed + '-troops'];
    delete state.g.values[removed + '-available'];
  }
}

export function spiceCollection(round) {
  const g = state.g;
  const base = `r${round}p7`;
  const order = roundOrder(round);
  const options = order.map(f => [f, g.playerNames[f] ? `${N[f]} · ${g.playerNames[f]}` : N[f]]);
  const cistern = g.modules.discovery ? v(base + '-owner-cistern', '') : '';
  const orgiz = g.modules.discovery ? v(base + '-owner-orgiz', '') : '';
  const { forts, homeworlds } = boardPositions(g, round);
  const assignments = panel('Крепости', `
    <p class="small">Контроль указан на шаге «Войска после боя». Для исправления вернитесь назад.</p>
    <table aria-label="Крепости">
      <thead><tr><th scope="col">Крепость</th><th scope="col">Контроль</th>${g.advanced ? '<th scope="col">Спайс</th>' : ''}</tr></thead>
      <tbody>${forts.filter(fort => fort.income).map(fort => `<tr>
        <th scope="row">${fort.name}</th><td>${fortStatus(fort)}</td>${g.advanced ? `<td>+${fort.income}</td>` : ''}
      </tr>`).join('')}</tbody>
    </table>
    ${g.alliances && order.includes('Ecaz') ? accordion('Ecaz · совместный сбор', `
      <p>Спайс, собранный вместе в пустыне, делите по договорённости. Если не договорились, разделите поровну. Нечётный остаток получает союзник Ecaz. Калькулятор не делит его автоматически.</p>
      ${g.advanced ? '<p>В Advanced каждый получает из банка полный доход совместно занятой крепости.</p>' : '<p>В Basic дополнительный доход за занятие этих крепостей не начисляется.</p>'}
    `) : ''}
  `);
  const occupation = homeworlds.length ? panel('Homeworlds', `
    <table aria-label="Homeworlds">
      <thead><tr><th scope="col">Мир</th><th scope="col">Резерв</th><th scope="col">Оккупация</th></tr></thead>
      <tbody>${homeworlds.map(world => `<tr>
        <th scope="row">${world.name}</th>
        <td>${world.forces.find(force => force.faction === world.native).count ?? '—'}</td>
        <td>${world.occupier ? N[world.occupier] : homeworldStatus(world)}</td>
      </tr>`).join('')}</tbody>
    </table>
  `) : '';

  const discoveries = g.modules.discovery ? panel('Discovery-локации', `
    <p class="small">Выбирайте игрока, только если его войска находятся внутри раскрытой локации.</p>
    <label>Cistern · +2 спайса из банка
      ${select(base + '-owner-cistern', [['', 'Не раскрыта или не занята'], ...options], '', 'Cistern')}
    </label>
    <label>Orgiz Processing Station · 1 спайс с каждого собранного Spice Blow
      ${select(base + '-owner-orgiz', [['', 'Не раскрыта или не занята'], ...options], '', 'Orgiz Processing Station')}
    </label>
    ${orgiz ? '<p class="small">Вводите каждый собранный Spice Blow отдельной строкой сектора. Калькулятор переводит владельцу станции 1 спайс с каждой такой строки у остальных игроков.</p>' : ''}
  `) : '';

  const collections = options.map(([f, player]) => {
    const id = base + f;
    const occupied = forts.filter(fort => !fort.contested && fort.occupants.includes(f));
    const rate = occupied.some(fort => fort.id === 'arr' || fort.id === 'car') ? 3 : 2;
    const income = g.advanced ? occupied.reduce((sum, fort) => sum + fort.income, 0) : 0;
    const sectors = Array.from({ length: v(id + '-sector-count', 1) }, (_, index) => {
      const key = sectorKey(id, index);
      const collected = Math.min(rate * Number(v(key + '-troops', 0)), Number(v(key + '-available', 0)));
      return { key, collected };
    });
    const collected = sectors.reduce((sum, sector) => sum + sector.collected, 0);
    const orgizPaid = orgiz && orgiz !== f
      ? sectors.filter(sector => sector.collected > 0).length
      : 0;
    return { f, player, id, rate, income, sectors, collected, orgizPaid };
  });
  const orgizIncome = collections.reduce((sum, player) => sum + player.orgizPaid, 0);
  const players = collections.map(({ f, player, id, rate, income, sectors, collected, orgizPaid }) => {
    const cisternIncome = f === cistern ? 2 : 0;
    const orgizReceived = f === orgiz ? orgizIncome : 0;
    return `<section class="panel" data-collection-faction="${esc(f)}" aria-label="${esc(player)}">
      <div class="row"><h3>${esc(player)}</h3><div class="metric"><b><output data-collection-total>${collected + income + cisternIncome + orgizReceived - orgizPaid}</output></b><span class="small">Всего спайса</span></div></div>
      <p class="small">Секторы: ${collected} · Крепости: ${income} · До ${rate} за войско${cisternIncome ? ' · Cistern: +2' : ''}${orgizReceived ? ` · Orgiz: +${orgizReceived}` : ''}${orgizPaid ? ` · Orgiz: −${orgizPaid}` : ''}</p>
      ${sectors.map(({ key, collected }, index) => `
        <div class="section">Сектор ${index + 1} · собрано ${collected}</div>
        <div class="grid">
          <div><div class="small">Войска</div>${counter(key + '-troops', 0, 20)}</div>
          <div><div class="small">Спайс на поле</div>${counter(key + '-available', 0, 120)}</div>
        </div>`).join('')}
      <div class="row" style="margin-top:10px">
        ${sectors.length < 20 ? `<button class="tinybtn" data-collection-add="${esc(f)}">+ Добавить сектор</button>` : ''}
        ${sectors.length > 1 ? `<button class="tinybtn" data-collection-remove="${esc(f)}">Убрать последний сектор</button>` : ''}
      </div>
      ${extra(f, 7)}
    </section>`;
  }).join('');

  return assignments + occupation + discoveries + players + accordion('Правила сбора спайса', note('Для каждого места сбора укажите войска и спайс в том же секторе. За войско можно собрать до 2 спайса, а при занятии Arrakeen или Carthag — до 3. Сбор в секторе ограничен запасом спайса в нём. Доход крепостей начисляется отдельно, один раз за фазу.'));
}
