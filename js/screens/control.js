import { state } from "../state.js";
import { N } from "../data.js";
import { current } from "../game.js";
import { boardPositions } from "../positions.js";
import { esc, panel } from "../ui.js";
import { cardHolder, strongholdEffects } from "./battle.js";
import { discoveryHints, fortStatus, homeworldStatus, locationRow } from "./positions.js";

export function control() {
  const game = state.g;
  const step = current();
  const lastRound = step.p > 6 || step.part === 'positions' ? step.r : step.r - 1;
  let positions;
  let recordedRound = lastRound;
  while (recordedRound > 0) {
    const candidate = boardPositions(game, recordedRound);
    if (candidate.forts.some(fort => fort.recorded || fort.occupants.length || fort.needsReview)
      || candidate.discoveries.some(location => game.values[location.key] !== undefined)
      || candidate.homeworlds.some(world => world.recorded)) {
      positions = candidate;
      break;
    }
    recordedRound--;
  }
  const { forts, discoveries, homeworlds } = positions ?? boardPositions(game, 0);
  const cardRound = step.p === 9 || (step.p === 8 && game.checks[`r${step.r}p8-strong`])
    ? step.r : step.r - 1;
  const cards = game.advanced && game.modules.stronghold && cardRound > 0
    ? boardPositions(game, cardRound).forts : [];
  const fortRows = forts.map(fort => {
    const holder = cardHolder(cards.find(location => location.id === fort.id));
    const benefit = fort.id === 'arr' || fort.id === 'car'
      ? '<p>Присутствие бойцов даёт доступ к орнитоптерам в Movement и сбор до 3 спайса за войско в Spice Collection.</p>' : '';
    const income = game.advanced && fort.income > 0
      ? `<p>В Spice Collection занимающая крепость фракция получает ${fort.income} спайса из банка.</p>` : '';
    const card = game.advanced && game.modules.stronghold && strongholdEffects[fort.id]
      ? `<p><strong>Stronghold Card · ${holder ? N[holder] : cardRound ? 'держатель не указан' : 'выдаётся в конце первого раунда'}</strong></p><p>${strongholdEffects[fort.id]}</p>` : '';
    return locationRow(fort.name, fortStatus(fort),
      (fort.occupants.length && fort.count ? `<p>Войска · ${esc(fort.count)}</p>` : '')
      + benefit + income + card + (fort.id === 'jacurutu' ? `<p>${discoveryHints.jacurutu}</p>` : '')
      || '<p>Контроль этой крепости учитывается при проверке победы.</p>');
  }).join('');
  const discoveryRows = discoveries.map(location =>
    locationRow(location.name, N[location.owner] || 'Не раскрыта или пуста', `<p>${discoveryHints[location.id]}</p>`)
  ).join('');
  const worldRows = homeworlds.map(world => {
    const { income, effect } = world;
    return locationRow(world.name, homeworldStatus(world), `
      <p>Хозяин · ${N[world.native]}</p>
      <p><strong>${world.occupier ? 'Преимущество фракции «' + N[world.occupier] + '»' : 'Эффект при оккупации'}</strong></p>
      <p>${effect}</p>
      ${income ? `<p>В Spice Collection оккупант получает ${income} спайса из банка.</p>` : ''}
    `);
  }).join('');

  return `<div class="top"><button class="subtle" data-action="close-control">← К партии</button><strong>Контроль</strong></div>
    <div class="body"><h2>Контроль локаций</h2>
      <p class="muted">${positions ? 'Войска после боя · раунд ' + recordedRound : 'Контроль появится после записи войск по итогам боя.'}</p>
      ${panel('Крепости', fortRows)}
      ${discoveryRows ? panel('Discovery-локации', discoveryRows) : ''}
      ${worldRows ? panel('Homeworlds', worldRows) : ''}
    </div>`;
}
