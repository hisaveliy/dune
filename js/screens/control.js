import { state } from "../state.js";
import { N } from "../data.js";
import { current } from "../game.js";
import { boardPositions, homeworldsBeforeBattle } from "../positions.js";
import { panel, select } from "../ui.js";
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
  const { forts, discoveries, homeworlds: currentWorlds } = boardPositions(game, step.r);
  const homeworlds = lastRound === step.r ? currentWorlds : homeworldsBeforeBattle(game, step.r);
  const factions = game.selected.map(f => [f, N[f]]);
  const fortOptions = [['', 'Не указано'], ['none', 'Пусто'], ...factions];
  const discoveryOptions = [['', 'Не раскрыта или пуста'], ...factions];
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
    const previous = recordedRound < step.r && !fort.recorded && !fort.occupants.length && !fort.needsReview
      && game.values[fort.occupantKey] === undefined && positions?.forts.find(location => location.id === fort.id);
    const guide = benefit + income + card + (fort.id === 'jacurutu' ? `<p>${discoveryHints.jacurutu}</p>` : '')
      || '<p>Контроль этой крепости учитывается при проверке победы.</p>';
    return locationRow(fort.name, fortStatus(fort),
      `<label>Фракция${select(fort.occupantKey, fortOptions, fort.faction, fort.name)}</label>`
      + (previous && (previous.recorded || previous.occupants.length || previous.needsReview)
        ? `<p class="small">Раунд ${recordedRound} · ${fortStatus(previous)}</p>` : '')
      + guide);
  }).join('');
  const discoveryRows = discoveries.map(location => {
    const previous = recordedRound < step.r && game.values[location.key] === undefined
      && positions?.discoveries.find(entry => entry.id === location.id)?.owner;
    return locationRow(location.name, N[location.owner] || 'Не раскрыта или пуста',
      `<label>Фракция${select(location.key, discoveryOptions, location.owner, location.name)}</label>`
      + (previous ? `<p class="small">Раунд ${recordedRound} · ${N[previous]}</p>` : '')
      + `<p>${discoveryHints[location.id]}</p>`);
  }).join('');
  const worldRows = homeworlds.map(world => {
    const { income, effect } = world;
    return locationRow(world.name, homeworldStatus(world), `
      <p>Хозяин · ${N[world.native]}</p>
      <label>Кто занимает мир?${select(world.factionKey, factions, world.occupier || world.native, world.name)}</label>
      <p><strong>${world.occupier ? 'Преимущество фракции «' + N[world.occupier] + '»' : 'Эффект при оккупации'}</strong></p>
      <p>${effect}</p>
      ${income ? `<p>В Spice Collection оккупант получает ${income} спайса из банка.</p>` : ''}
    `);
  }).join('');

  return `<div class="top"><button class="subtle" data-action="close-control">← К партии</button><strong>Контроль</strong></div>
    <div class="body"><h2>Контроль локаций</h2>
      <p class="muted">Изменения сохраняются сразу · раунд ${step.r}</p>
      ${panel('Крепости', fortRows)}
      ${discoveryRows ? panel('Discovery-локации', discoveryRows) : ''}
      ${worldRows ? panel('Homeworlds', worldRows) : ''}
    </div>`;
}
