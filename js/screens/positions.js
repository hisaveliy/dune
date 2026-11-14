import { N } from "../data.js";
import { boardPositions } from "../positions.js";
import { state } from "../state.js";
import { esc, panel, select } from "../ui.js";

const counts = [['', 'Не указано'], ...Array.from({ length: 21 }, (_, count) => [count, count])];

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

function troopSummary(forces) {
  return forces.filter(force => force.count > 0)
    .map(force => `${N[force.faction]} · ${force.count}`).join(', ');
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
  if (world.needsReview) return 'Уточните оккупанта';
  return world.recorded ? 'Без оккупанта' : 'Резерв не указан';
}

export function positions(round) {
  const g = state.g;
  const { forts, homeworlds } = boardPositions(g, round);
  const allyOptions = g.selected.filter(f => f !== 'Ecaz').map(f => [f, N[f]]);
  return panel('Войска после боя', `
    <p class="muted">Нажмите на крепость, чтобы указать войска. Учитывайте только бойцов.</p>
    ${g.alliances && g.selected.includes('Ecaz') ? `<label>Союзник Ecaz
      ${select(`r${round}p7-ecaz-ally`, [['', 'Нет союзника'], ...allyOptions], '', 'Союзник Ecaz')}
    </label>` : ''}
    ${forts.map(fort => {
      const status = troopSummary(fort.forces);
      return locationRow(fort.name, fort.contested ? 'Спорная · ' + status : status || fortStatus(fort), fields(fort.forces));
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
        fields([reserve, ...world.forces.filter(force => force !== reserve)], world.native) + occupation);
    }).join('')}
  `) : '');
}
