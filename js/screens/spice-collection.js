import { N } from "../data.js";
import { roundOrder } from "../game.js";
import { state } from "../state.js";
import { accordion, c, check, counter, esc, extra, note, panel, select, v } from "../ui.js";

const strongholds = [
  { key: 'arr', name: 'Arrakeen', income: 2 },
  { key: 'car', name: 'Carthag', income: 2 },
  { key: 'tuek', name: 'Tuek’s Sietch', income: 1 }
];

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
  const hasEcazAlliance = g.alliances && order.includes('Ecaz');
  const allies = hasEcazAlliance ? options.filter(([f]) => f !== 'Ecaz') : [];
  const ally = v(base + '-ecaz-ally', '');
  const alliance = allies.some(([f]) => f === ally) ? ['Ecaz', ally] : [];
  const forts = strongholds.map(fort => {
    const id = `${base}-owner-${fort.key}`;
    const legacyOwners = order.filter(f => c(`${base}${f}-${fort.key}`));
    const fallback = legacyOwners.length === 1 ? legacyOwners[0] : '';
    const owner = v(id, fallback);
    const sharedKey = `${base}-shared-${fort.key}-${ally}`;
    const canShare = alliance.includes(owner);
    const occupants = canShare && c(sharedKey) ? alliance : [owner];
    return { ...fort, id, fallback, sharedKey, canShare, occupants,
      needsReview: legacyOwners.length > 1 && v(id, undefined) === undefined };
  });

  const assignments = panel('Крепости', `
    <p class="small">${g.advanced
      ? 'Выберите, кто занимает каждую крепость и получает её доход из банка.'
      : 'В Basic крепости влияют на скорость сбора. Доход из банка за крепости не начисляется.'}</p>
    ${forts.map(fort => `<label>${fort.name}${g.advanced ? ` · +${fort.income} спайса` : ''}
      ${select(fort.id, [['', 'Никто'], ...options], fort.fallback, fort.name)}
    </label>${fort.needsReview ? note('В старом сохранении указано несколько владельцев. Уточните, кто занимает эту крепость.') : ''}`).join('')}
    ${hasEcazAlliance ? accordion('Ecaz · совместный сбор', `
      <label>Союзник Ecaz${select(base + '-ecaz-ally', [['', 'Нет союзника'], ...allies], '', 'Союзник Ecaz')}</label>
      <p>Выберите одного из союзников владельцем крепости и отметьте совместное занятие, если в ней есть войска обоих. ${g.advanced ? 'В Advanced каждый получает из банка полный доход этой крепости.' : 'В Basic дополнительный доход за занятие этих крепостей не начисляется.'}</p>
      ${forts.filter(fort => fort.canShare).map(fort => check(fort.sharedKey, `Ecaz и ${N[ally]} вместе занимают ${fort.name}`)).join('')}
      <p>Спайс, собранный вместе в пустыне, делите по договорённости. Если не договорились, разделите поровну. Нечётный остаток получает союзник Ecaz. Калькулятор не делит его автоматически.</p>
    `) : ''}
  `);

  const players = options.map(([f, player]) => {
    const id = base + f;
    const occupied = forts.filter(fort => fort.occupants.includes(f));
    const rate = occupied.some(fort => fort.key === 'arr' || fort.key === 'car') ? 3 : 2;
    const income = g.advanced ? occupied.reduce((sum, fort) => sum + fort.income, 0) : 0;
    const sectors = Array.from({ length: v(id + '-sector-count', 1) }, (_, index) => {
      const key = sectorKey(id, index);
      const collected = Math.min(rate * Number(v(key + '-troops', 0)), Number(v(key + '-available', 0)));
      return { key, collected };
    });
    const collected = sectors.reduce((sum, sector) => sum + sector.collected, 0);
    return `<section class="panel" data-collection-faction="${esc(f)}" aria-label="${esc(player)}">
      <div class="row"><h3>${esc(player)}</h3><div class="metric"><b><output data-collection-total>${collected + income}</output></b><span class="small">Всего спайса</span></div></div>
      <p class="small">Секторы: ${collected} · Крепости: ${income} · До ${rate} за войско</p>
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

  return assignments + players + accordion('Правила сбора спайса', note('Для каждого места сбора укажите войска и спайс в том же секторе. За войско можно собрать до 2 спайса, а при занятии Arrakeen или Carthag — до 3. Сбор в секторе ограничен запасом спайса в нём. Доход крепостей начисляется отдельно, один раз за фазу.'));
}
