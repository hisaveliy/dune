import { boardPositions } from "../positions.js";
import { fortStatus, homeworldStatus } from "./positions.js";
import { N } from "../data.js";
import { roundOrder } from "../game.js";
import { state } from "../state.js";
import { accordion, esc, note, panel } from "../ui.js";

export function spiceCollection(round) {
  const g = state.g;
  const order = roundOrder(round);
  const { forts, homeworlds, discoveries } = boardPositions(g, round);
  const orgiz = discoveries.find(location => location.id === 'orgiz')?.owner;
  const fremenWorld = homeworlds.find(world => world.id === 'Fremen' && world.occupier);
  const assignments = panel('Крепости', `
    <p class="small">Контроль указан на шаге «Войска после боя». Для исправления вернитесь назад.</p>
    <table aria-label="Крепости">
      <thead><tr><th scope="col">Крепость</th><th scope="col">Контроль</th>${g.advanced ? '<th scope="col">Спайс</th>' : ''}</tr></thead>
      <tbody>${forts.filter(fort => fort.income).map(fort => `<tr>
        <th scope="row">${fort.name}</th><td>${fortStatus(fort)}</td>${g.advanced ? `<td>+${fort.income}</td>` : ''}
      </tr>`).join('')}</tbody>
    </table>
    ${g.alliances && order.includes('Ecaz') ? accordion('Ecaz · совместный сбор', `
      <p>Спайс, собранный вместе в пустыне, делите по договорённости. Если не договорились, разделите поровну. Нечётный остаток получает союзник Ecaz.</p>
      ${g.advanced ? '<p>В Advanced каждый получает из банка полный доход совместно занятой крепости.</p>' : '<p>В Basic дополнительный доход за занятие этих крепостей не начисляется.</p>'}
    `) : ''}
  `);
  const occupation = homeworlds.length ? panel('Homeworlds', `
    <table aria-label="Homeworlds">
      <thead><tr><th scope="col">Мир</th><th scope="col">Контроль</th><th scope="col">Из банка</th></tr></thead>
      <tbody>${homeworlds.map(world => `<tr>
        <th scope="row">${world.name}</th>
        <td>${homeworldStatus(world)}</td>
        <td>${world.occupier && world.income ? `+${world.income}` : '—'}</td>
      </tr>`).join('')}</tbody>
    </table>
    ${g.alliances && homeworlds.some(world => world.occupier && world.income) ? '<p class="small">Оккупант может сразу поделиться доходом за оккупацию с союзником.</p>' : ''}
  `) : '';

  const discoverySummary = discoveries.length ? panel('Discovery-локации', `
    <table aria-label="Discovery-локации">
      <thead><tr><th scope="col">Локация</th><th scope="col">Контроль</th></tr></thead>
      <tbody>${discoveries.map(({ name, owner }) => `<tr>
        <th scope="row">${name}</th><td>${N[owner] || '—'}</td>
      </tr>`).join('')}</tbody>
    </table>
  `) : '';

  const players = order.map(f => {
    const player = g.playerNames[f] ? `${N[f]} · ${g.playerNames[f]}` : N[f];
    const occupied = forts.filter(fort => !fort.contested && fort.occupants.includes(f));
    const rate = occupied.some(fort => fort.id === 'arr' || fort.id === 'car') ? 3 : 2;
    const sources = [
      ...(g.advanced ? occupied.filter(fort => fort.income > 0) : []),
      ...discoveries.filter(location => location.owner === f && location.income > 0),
      ...homeworlds.filter(world => world.occupier === f && world.income > 0)
        .map(world => ({ name: world.name + ' · оккупация', income: world.income }))
    ];
    const income = sources.reduce((sum, source) => sum + source.income, 0);
    const row = `<strong>${esc(player)}</strong>
      <span class="collection-rate"><span class="collection-reader">С поля, до </span>${rate}<span class="collection-reader"> спайса за войско</span></span>
      <span class="collection-payout"><span class="collection-reader">Из банка, спайса </span><output data-collection-income>${income}</output></span>`;
    return income ? `<details class="collection-faction" data-collection-faction="${esc(f)}" data-rule="collection-${esc(f)}">
      <summary class="collection-row">${row}</summary>
      <ul class="collection-sources">${sources.map(({ name, income }) =>
        `<li><span>${esc(name)}</span><strong>+${income}</strong></li>`).join('')}</ul>
    </details>` : `<div class="collection-row collection-faction" data-collection-faction="${esc(f)}">${row}</div>`;
  }).join('');

  return `<section class="panel collection-summary" aria-label="Сбор спайса по фракциям">
    <div class="collection-row collection-heading" aria-hidden="true">
      <strong>Фракция</strong><strong>С поля<small>макс. за войско</small></strong><strong>Из банка<small>спайса</small></strong>
    </div>
    ${players}
  </section>`
    + (fremenWorld ? note(`Передайте фракции «${N[fremenWorld.occupier]}» половину всего спайса, собранного Фременами в этой фазе, округлив вниз.`) : '')
    + (orgiz ? note(`Передайте фракции «${N[orgiz]}» по 1 спайсу из каждого Spice Blow, с которого собрали спайс другие игроки. Снимите этот спайс с их сбора на поле.`) : '')
    + accordion('Контроль локаций', assignments + occupation + discoverySummary)
    + accordion('Правила сбора спайса',
      note('Собирайте спайс войсками из того же сектора. Сбор ограничен спайсом на поле. Выплаты из банка начисляются отдельно, один раз за фазу.'));
}
