import { state } from "../state.js";
import { N } from "../data.js";
import { current } from "../game.js";
import { boardPositions } from "../positions.js";
import { esc, panel } from "../ui.js";
import { cardHolder, strongholdEffects } from "./battle.js";
import { discoveryHints, fortStatus, homeworldStatus, locationRow } from "./positions.js";

// The coin symbols in the Occupied section give the bank payout in Spice Collection.
const occupationEffects = {
  Atreides: [2, 'Оккупант разделяет предвидение Атрейдесов на Bidding и может смотреть карты, выставляемые на торги.'],
  Harkonnen: [2, 'Когда Харконнены покупают Treachery Card, их дополнительную бесплатную карту получает оккупант или его союзник при наличии места в руке.'],
  Fremen: [0, 'Оккупант получает половину всего спайса, который Фремены собирают в Spice Collection, с округлением вниз.'],
  Emperor: [2, 'Оккупант получает половину каждого платежа за Treachery Card, причитающегося Императору, с округлением вниз.'],
  salusa: [0, 'Sardaukar Императора теряют своё фракционное преимущество.'],
  Guild: [2, 'Оккупант получает половину платежей других игроков за высадку, причитающихся Гильдии, с округлением вниз.'],
  'Bene Gesserit': [1, 'Оккупант и его союзник защищены от Voice.'],
  Ixians: [2, 'Оккупант получает преимущество Иксиан на Bidding: смотрит карты, взятые для торгов, и выбирает одну для удаления из торгов.'],
  Tleilaxu: [2, 'Тлейлаксу не могут раскрывать Face Dancers против оккупанта или его союзника.'],
  CHOAM: [2, 'Лимит руки оккупанта и его союзника увеличивается на 1. После окончания оккупации они сбрасывают лишние карты до обычного лимита. CHOAM теряет преимущество Low Threshold.'],
  Richese: [1, 'Оккупант выбирает, какую карту из запаса Richese выставят на торги, и получает половину платежа Richese с округлением вниз.'],
  Ecaz: [2, 'Оккупант или его союзник получает Duke Vidal и может воскресить его из Tanks. Этот эффект имеет приоритет над обычными способностями Ecaz и Moritani, связанными с Vidal.'],
  Moritani: [2, 'Moritani не могут раскрыть Terror Token, когда оккупант или его союзник входит в территорию с этим жетоном.']
};

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
      || candidate.homeworlds.some(world => world.recorded || world.visitors.length)) {
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
    const reserve = world.forces.find(force => force.faction === world.native).count;
    const [income, effect] = occupationEffects[world.id];
    return locationRow(world.name, homeworldStatus(world), `
      <p>Хозяин · ${N[world.native]} · резерв ${reserve ?? 'не указан'}</p>
      ${world.visitors.length ? '<p>Чужие войска · ' + world.visitors.map(force => `${N[force.faction]} · ${force.count}`).join(', ') + '</p>' : ''}
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
