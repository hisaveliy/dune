import { state } from "../state.js";
import { N } from "../data.js";
import { esc, note, panel, select, v } from "../ui.js";
import { charitySummary, inflationPlacement } from "../charity.js";

export function choamBalance(round) {
  const stock = v('r' + round + 'p2CHOAM-stock', '');
  if (stock === '') return '<span class="muted">Прежний запас не включён в остаток дохода.</span>';
  const summary = charitySummary(state.g, round);
  return `Полный запас CHOAM: ${Number(stock)} + ${summary.income} − ${summary.paid} = <b data-choam-total>${Number(stock) + summary.remaining}</b> спайса.`;
}

export function charity(round) {
  const summary = charitySummary(state.g, round);
  const base = 'r' + round + 'p2';
  let content = '';
  if (summary.hasChoam) {
    content += panel('Сначала CHOAM получает доход', `
      <p>Из банка: 2 × ${state.g.selected.length} фракций${summary.factor === 1 ? '' : ' × ' + summary.factor} = <b data-choam-income>${summary.income}</b> спайса.</p>
      ${note(summary.factor === 0 ? 'Cancel: доход CHOAM и все выплаты Charity отменены, включая Bene Gesserit.' : summary.factor === 2 ? 'Double: доход CHOAM и выплаты Charity удвоены. При активной стороне Double взятки спайсом запрещены.' : 'Обычные выплаты. Инфляция применяется со следующего раунда после размещения жетона в Mentat Pause.')}
      <label>Запас CHOAM до фазы (необязательно)
        <input class="field" type="number" min="0" step="1" data-value="${base}CHOAM-stock" value="${esc(v(base + 'CHOAM-stock', ''))}" placeholder="Текущий запас до получения дохода">
      </label>`);
  } else {
    content += note('Благотворительность выплачивает банк: при 0 спайса — 2, при 1 — 1, при 2 и более — 0.');
  }
  const rows = summary.payouts.filter(({ faction }) => faction !== 'CHOAM').map(({ faction, amount }) => {
    const title = N[faction] + (state.g.playerNames[faction] ? ' · ' + state.g.playerNames[faction] : '');
    return `<tr>
      <th scope="row">${esc(title)}</th>
      <td>${select(base + faction + '-bracket', [['0', '0'], ['1', '1'], ['2', '2+']], '2', 'Спайс перед Charity · ' + title)}</td>
      <td>+<output data-charity="${esc(faction)}">${amount}</output></td>
    </tr>`;
  }).join('');
  content += panel('Выплаты ' + (summary.hasChoam ? 'от CHOAM' : 'из банка'), `
    <table><thead><tr><th>Игрок</th><th>Спайс до фазы</th><th>Выплата</th></tr></thead><tbody>${rows}</tbody></table>
    ${state.g.selected.includes('Bene Gesserit') && state.g.advanced ? note('Bene Gesserit в Advanced получают 2 спайса независимо от запаса, в том числе в первом раунде. Инфляция удваивает или отменяет эту выплату.') : ''}`);
  if (summary.hasChoam) {
    content += panel('CHOAM после выплат', `
      <p>Выдано игрокам: <b>${summary.paid}</b> спайса.</p>
      <p>Остаток дохода этой фазы: <b data-choam-remaining>${summary.remaining}</b> спайса.</p>
      <p data-choam-balance>${choamBalance(round)}</p>`);
  }
  if (state.g.modules.tech) content += note('Spice Production: если хотя бы одна фракция получила обычное Charity (включая особое Charity Bene Gesserit), владелец жетона получает из банка по 1 спайсу за каждый свой Tech Token. Один лишь особый доход CHOAM не запускает этот эффект; инфляция не меняет размер дохода Tech Token.');
  return content;
}

export function inflationMentat(round) {
  if (!state.g.selected.includes('CHOAM')) return '';
  const placed = inflationPlacement(state.g);
  if (!placed || placed.round >= round) {
    if (round === 10) return '';
    return panel('CHOAM · Inflation Token', `
      <label>Разместить жетон инфляции на следующие два раунда:
        ${select('r' + round + 'p8-inflation', [['none', 'Не размещать'], ['double', 'Double → Cancel'], ['cancel', 'Cancel → Double']], 'none')}
      </label>
      ${note('Первый эффект действует в раунде ' + (round + 1) + (round < 9 ? ', противоположный — в раунде ' + (round + 2) + '. После второго эффекта жетон удаляется из игры.' : '. Партия заканчивается после десятого раунда, поэтому второй эффект не наступит.') + ' При стороне Double взятки спайсом запрещены с момента её появления в игре.')}`);
  }
  if (round === placed.round + 1) {
    return panel('CHOAM · перевернуть Inflation Token', note('В этом Mentat Pause переверните жетон: в следующем раунде ' + (placed.side === 'double' ? 'Charity отменяется (Cancel)' : 'Charity удваивается (Double), взятки спайсом запрещены') + '.'));
  }
  return panel('CHOAM · Inflation Token', note(round === placed.round + 2 ? 'В этом Mentat Pause удалите перевёрнутый жетон из игры. Со следующего раунда Charity снова обычное.' : 'Жетон инфляции уже использован и удалён из игры. Повторное размещение недоступно.'));
}
