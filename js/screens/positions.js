import { N } from "../data.js";
import { boardPositions } from "../positions.js";
import { state } from "../state.js";
import { esc, panel, select } from "../ui.js";

export const discoveryHints = {
  jacurutu: 'Считается крепостью. Победитель боя здесь получает по 1 спайсу за каждое войско противника, которое не было выставлено на диске и отправилось в Tanks.',
  cistern: 'Фракция, занимающая Cistern в Spice Collection, получает 2 спайса из банка.',
  orgiz: 'В Spice Collection фракция, занимающая станцию, забирает по 1 спайсу из каждого Spice Blow, с которого собрали спайс.',
  'testing-station': 'В фазе Storm фракция, занимающая станцию, может увеличить или уменьшить движение бури на 1 сектор. На Weather Control этот эффект не влияет.',
  shrine: 'Пока фракция занимает Shrine, она может сыграть Truthtrance как Karama и Karama как Truthtrance.'
};

export function locationRow(name, status, editor) {
  return `<details class="position-location" data-rule="${esc(name)}">
    <summary><strong>${name}</strong><span class="position-status">${status}</span></summary>
    <div class="position-editor">${editor}</div>
  </details>`;
}

export function fortStatus(fort) {
  if (fort.needsReview) return 'В старой партии несколько владельцев. Уточните, кто занимает крепость.';
  if (!fort.recorded && !fort.occupants.length) return 'Не указано';
  if (!fort.occupants.length) return 'Пусто';
  const factions = fort.occupants.map(f => N[f]).join(' и ');
  if (fort.contested) return 'Спорная крепость · ' + factions;
  return factions + (fort.recorded ? '' : ' · из сохранения');
}

export function homeworldStatus(world) {
  if (world.occupier) return 'Оккупант · ' + N[world.occupier];
  if (world.needsReview) return 'Уточните оккупанта';
  return N[world.native];
}

export function positions(round) {
  const g = state.g;
  const { forts, homeworlds, discoveries } = boardPositions(g, round);
  const playerOptions = g.selected.map(f => [f, N[f]]);
  const factions = [['', 'Не указано'], ['none', 'Пусто'], ...playerOptions];
  return panel('Войска после боя', `
    <p class="muted">Укажите, чьи бойцы остались в крепости.</p>
    ${forts.map(fort => locationRow(fort.name, fortStatus(fort),
      `<label>Фракция${select(fort.occupantKey, factions, fort.faction, fort.name)}</label>`
      + (fort.id === 'jacurutu' ? `<p class="muted">${discoveryHints.jacurutu}</p>` : '')
    )).join('')}
  `) + (homeworlds.length ? panel('Homeworlds', `
    ${homeworlds.map(world => locationRow(world.name, homeworldStatus(world),
      `<label>Кто занимает мир?${select(world.factionKey, playerOptions, world.occupier || world.native, world.name)}</label>`
    )).join('')}
  `) : '') + (discoveries.length ? panel('Discovery-локации', `
    <p class="muted">Укажите, чьи войска находятся внутри раскрытых локаций.</p>
    ${discoveries.map(({ id, name, owner, key }) => locationRow(name, N[owner] || 'Не раскрыта или пуста',
      `<label>Фракция${select(key, [['', 'Не раскрыта или пуста'], ...playerOptions], '', name)}</label>`
      + `<p class="muted">${discoveryHints[id]}</p>`
    )).join('')}
  `) : '');
}
