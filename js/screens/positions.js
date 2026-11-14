import { N } from "../data.js";
import { boardPositions } from "../positions.js";
import { state } from "../state.js";
import { esc, panel, select } from "../ui.js";

const counts = [['', 'Не указано'], ...Array.from({ length: 21 }, (_, count) => [count, count])];
const fortressCounts = counts.filter(([count]) => count !== 0);

function fields(forces, native) {
  return `<div class="grid">${forces.map(({ faction, key }) => `<label>${N[faction]}${faction === native ? ' · резерв' : ''}
    ${select(key, counts, '')}
  </label>`).join('')}</div>`;
}

function locationRow(name, status, editor) {
  return `<details class="position-location" data-rule="${esc(name)}">
    <summary><strong>${name}</strong><span class="position-status">${status}</span></summary>
    <div class="position-editor">${editor}</div>
  </details>`;
}

export function fortStatus(fort) {
  if (fort.needsReview) return 'В старой партии несколько владельцев. Уточните войска.';
  if (!fort.recorded && !fort.occupants.length) return 'Не указано';
  if (!fort.occupants.length) return 'Пусто';
  const factions = fort.occupants.map(f => N[f]).join(' и ');
  if (fort.contested) return 'Спорная крепость · ' + factions;
  return factions + (fort.recorded ? '' : ' · из сохранения');
}

export function homeworldStatus(world) {
  if (world.occupier) return 'Оккупант · ' + N[world.occupier];
  if (!world.recorded && world.visitors.length) return 'Укажите резерв хозяина';
  if (world.needsReview) return 'Уточните оккупанта';
  return world.recorded ? 'Без оккупанта' : 'Резерв не указан';
}

export function positions(round) {
  const g = state.g;
  const { forts, homeworlds } = boardPositions(g, round);
  const factions = [['', 'Не указано'], ['none', 'Пусто'], ...g.selected.map(f => [f, N[f]])];
  return panel('Войска после боя', `
    <p class="muted">Нажмите на крепость, чтобы указать войска. Учитывайте только бойцов.</p>
    ${forts.map(fort => {
      const status = N[fort.faction] && !fort.recorded && !fort.occupants.length
        ? N[fort.faction] + ' · укажите количество' : fortStatus(fort);
      const summary = fort.occupants.length === 1 && fort.count ? `${status} · ${esc(fort.count)}` : status;
      return locationRow(fort.name, summary, `<div class="grid">
        <label>Фракция${select(fort.key + '-faction', factions, fort.faction)}</label>
        <label>Количество войск${select(fort.key + '-count', fortressCounts, fort.count)}</label>
      </div>`);
    }).join('')}
  `) + (homeworlds.length ? panel('Homeworlds', `
    <p class="muted">Нажмите на мир, чтобы указать резерв и чужие войска.</p>
    ${homeworlds.map(world => {
      const reserve = world.forces.find(force => force.faction === world.native);
      const status = world.recorded ? `Резерв ${reserve.count} · ${homeworldStatus(world)}` : homeworldStatus(world);
      const occupation = world.disputed && world.recorded ? `<label>Кто является оккупантом?
        ${select(world.key + '-occupier', [['', 'Уточнить'], ['none', 'Без оккупанта'], ...world.visitors.map(force => [force.faction, N[force.faction]])], '', 'Оккупант · ' + world.name)}
      </label>` : '';
      return locationRow(world.name, status,
        fields([reserve, ...world.forces.filter(force => force !== reserve)], world.native)
        + (!world.recorded && world.visitors.length ? '<p class="muted">Выберите 0, если у хозяина мира не осталось войск в резерве.</p>' : '')
        + occupation);
    }).join('')}
  `) : '');
}
