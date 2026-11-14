import { boardPositions } from "../positions.js";
import { fortStatus, homeworldStatus } from "./positions.js";
import { N } from "../data.js";
import { roundOrder } from "../game.js";
import { state } from "../state.js";
import { accordion, esc, extra, note, panel } from "../ui.js";

export function spiceCollection(round) {
  const g = state.g;
  const order = roundOrder(round);
  const options = order.map(f => [f, g.playerNames[f] ? `${N[f]} · ${g.playerNames[f]}` : N[f]]);
  const { forts, homeworlds, discoveries } = boardPositions(g, round);
  const orgiz = discoveries.find(location => location.id === 'orgiz')?.owner;
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
      <thead><tr><th scope="col">Мир</th><th scope="col">Резерв</th><th scope="col">Оккупация</th></tr></thead>
      <tbody>${homeworlds.map(world => `<tr>
        <th scope="row">${world.name}</th>
        <td>${world.forces.find(force => force.faction === world.native).count ?? '—'}</td>
        <td>${world.occupier ? N[world.occupier] : homeworldStatus(world)}</td>
      </tr>`).join('')}</tbody>
    </table>
  `) : '';

  const discoverySummary = discoveries.length ? panel('Discovery-локации', `
    <table aria-label="Discovery-локации">
      <thead><tr><th scope="col">Локация</th><th scope="col">Контроль</th></tr></thead>
      <tbody>${discoveries.map(({ name, owner }) => `<tr>
        <th scope="row">${name}</th><td>${N[owner] || '—'}</td>
      </tr>`).join('')}</tbody>
    </table>
    ${orgiz ? note(`Передайте фракции «${N[orgiz]}» по 1 спайсу из каждого Spice Blow, с которого собрали спайс другие игроки. Снимите этот спайс с их сбора на поле.`) : ''}
  `) : '';

  const players = options.map(([f, player]) => {
    const occupied = forts.filter(fort => !fort.contested && fort.occupants.includes(f));
    const rate = occupied.some(fort => fort.id === 'arr' || fort.id === 'car') ? 3 : 2;
    const fortressIncome = g.advanced ? occupied.reduce((sum, fort) => sum + fort.income, 0) : 0;
    const cisternIncome = discoveries.find(location => location.id === 'cistern' && location.owner === f)?.income ?? 0;
    return `<section class="panel" data-collection-faction="${esc(f)}" aria-label="${esc(player)}">
      <h3>${esc(player)}</h3>
      <p>На поле · до <strong>${rate} спайса за войско</strong></p>
      <p>Из банка · <strong><output data-collection-income>${fortressIncome + cisternIncome}</output> спайса</strong>${cisternIncome ? ` (крепости ${fortressIncome}, Cistern +${cisternIncome})` : ''}</p>
      ${extra(f, 7)}
    </section>`;
  }).join('');

  return assignments + occupation + discoverySummary + players + accordion('Правила сбора спайса',
    note('Собирайте спайс войсками из того же сектора. Сбор ограничен спайсом на поле. Выплаты из банка начисляются отдельно, один раз за фазу.'));
}
