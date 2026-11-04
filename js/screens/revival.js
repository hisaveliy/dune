import { state } from "../state.js";
import { N } from "../data.js";
import { counter, esc, note, panel, select, v } from "../ui.js";
import { revivalRules } from "../revival.js";

export const ecazAmbassadors = () => panel('Ecaz · конец Revival', '<p>Можно разместить одного или нескольких послов в крепостях без посла и без бури. Первый посол в этом раунде стоит 1 спайс, второй — 2, третий — 3 и так далее. Возможность действует и в первом раунде.</p>');
const priceCard = (title, amount, detail, attr) => `<div class="timerPanel" aria-label="${title}"><div class="small">${title}</div><div class="timer"><output ${attr}>${amount}</output> спайса</div><p>${detail}</p></div>`;

export function leaderPrice(s) {
  const x = revivalRules(state.g, s), type = v(x.id + '-leader-type', 'none');
  const entered = v(x.id + '-leader-price', '');
  const amount = type === 'vidal' ? 5 : type === 'zoal' ? 3 : entered === '' ? null : Math.max(0, Math.floor(Number(entered)));
  return priceCard('ЦЕНА ВОСКРЕШЕНИЯ ЛИДЕРА', amount === null ? '—' : type === 'early' ? amount : x.price(amount), 'Оплата: ' + x.recipient + ' · отдельно от войск', 'data-leader-revival-cost');
}

export function revival(s) {
  const g = state.g, f = s.f, x = revivalRules(g, s), id = x.id;
  const hasTleilaxu = g.selected.includes('Tleilaxu');
  const allies = g.alliances ? ['Fremen', 'Tleilaxu', 'Emperor'].filter(a => a !== f && g.selected.includes(a)) : [];
  const allyHints = { Fremen: 'Фремены дают 3 бесплатных воскрешения всего.', Tleilaxu: 'Тлейлаксу дают половину цены с округлением вверх.', Emperor: 'Император оплачивает до 3 дополнительных войск.' };
  const skip = s.r === 1 ? panel('Первый раунд · Revival открыт вручную', note('По умолчанию в первом раунде переходим сразу к Shipment & Movement. Если до боя уже были потери от бури или событий, здесь можно провести воскрешение по обычным правилам.')
    + (g.selected.includes('Ecaz') ? note('Ecaz могут разместить послов в конце Revival даже без воскрешений.') : '')
    + '<button class="button" data-action="skip-revival">Пропустить Revival →</button>') : '';
  const conditions = {
    Fremen: hasTleilaxu ? 'Без разрешения Тлейлаксу доступны только 3 бесплатных войска. С разрешения Тлейлаксу можно воскресить до 5, оплачивая дополнительные по 2 спайса.' : 'Доступны 3 бесплатных войска; обычная платная докупка не предусмотрена.',
    Emperor: (g.advanced ? 'Можно воскресить не более одного Sardaukar за раунд. Он считается одним войском и оплачивается по обычному тарифу. ' : '') + 'Как союзник, Император может оплатить до 3 дополнительных войск сверх лимита союзника.',
    Ixians: 'Бесплатное войско может быть Cyborg или Suboid. Здесь бесплатные места сначала отдаются Cyborg: платный Cyborg стоит 3 спайса, Suboid — 2. Cyborg входят в выбранное общее число войск, а не добавляются к нему.',
    Tleilaxu: 'Нет лимита количества своих воскрешаемых войск и лидеров; своих лидеров можно возвращать до гибели всех пяти. Плата в банк — половина обычной цены с округлением вверх. За каждую фракцию, использующую бесплатное воскрешение или карту Ghola, получите 1 спайс из банка, в том числе за себя.',
    CHOAM: 'Бесплатных войск нет. Количество платных воскрешений не ограничено; каждое войско стоит 1 спайс.'
  };
  let troops = `<div class="grid"><div class="metric"><b>${x.allowance}</b><span class="small">Бесплатных войск</span></div><div class="metric"><b>${x.cap === 20 ? 'Без лимита' : x.cap}</b><span class="small">Всего войск за фазу</span></div></div>`;
  if (allies.length) troops += '<p>Согласованный бонус действующего союзника:</p>' + select(id + '-ally', [['', 'Без бонуса'], ...allies.map(a => [a, N[a]])], '') + note('Выбирайте только фактического союзника, согласившегося дать бонус. ' + allies.map(a => allyHints[a]).join(' '));
  if (hasTleilaxu && !['Tleilaxu', 'CHOAM'].includes(f)) troops += '<p>Тлейлаксу разрешили увеличить лимит?</p>' + select(id + '-permission', [['no', 'Нет · до 3 войск'], ['yes', 'Да · до 5 войск']], 'no');
  troops += '<div class="section">Воскресить войск</div>' + counter(id + '-troops', 0, x.cap);
  if (f === 'Ixians') troops += '<div class="section">Из них Cyborg</div>' + counter(id + '-cyborgs', 0, Math.min(7, x.troops));
  troops += priceCard('ЦЕНА ВОСКРЕШЕНИЯ ВОЙСК', x.cost, 'Оплата: ' + x.recipient, 'data-revival-cost');
  if (x.ally === 'Emperor') troops += '<div class="section">Дополнительно за счёт Императора</div>' + counter(id + '-emperor', 0, Math.min(3, 20 - x.troops))
    + (f === 'Ixians' ? '<div class="section">Из дополнительных · Cyborg</div>' + counter(id + '-emperor-cyborgs', 0, Math.min(x.extra, 7 - x.cyborgs)) : '')
    + priceCard('ПЛАТИТ ИМПЕРАТОР', x.extra * (f === 'CHOAM' ? 1 : 2) + x.extraCyborgs, 'За ' + x.extra + ' дополнительных войск · получатель: ' + x.recipient, 'data-emperor-revival-cost')
    + note('Эти войска сверх выбранного основного числа. Император оплачивает их полностью; из своего запаса вы эту сумму не вычитаете. Ограничение одного элитного войска за раунд сохраняется.');
  troops += note('Возвращайте только реально находящиеся в Tanks войска в свой резерв, а не на поле. Бесплатные воскрешения входят в общий лимит. Обычное платное войско стоит 2 спайса.');
  if (conditions[f]) troops += note(conditions[f]);
  if (f === 'Fremen' && g.advanced) troops += note('За раунд можно воскресить не более одного Fedaykin. Он считается одним войском, в том числе при бесплатном воскрешении.');
  if (hasTleilaxu && f !== 'Tleilaxu') troops += note('За использование бесплатного воскрешения или Ghola Тлейлаксу получают 1 спайс из банка. Это не ваша дополнительная плата.');
  troops += note('Расчёт учитывает выбранные бонусы фракций. Эффекты карт, отменяющие бесплатное воскрешение или способности, применяйте отдельно.');

  const types = [['none', 'Не воскрешаю лидера'], ['normal', 'Обычный лидер · цена равна силе']];
  if (f === 'Ecaz') types.push(['vidal', 'Duke Vidal · 5 спайса']);
  if (f === 'Tleilaxu') types.push(['zoal', 'Zoal · базовая цена 3 спайса']);
  if (hasTleilaxu && f !== 'Tleilaxu') types.push(['early', 'Досрочно по договорённости с Тлейлаксу']);
  const type = v(id + '-leader-type', 'none');
  let leaders = note('Обычно воскрешение лидеров открывается, когда все 5 ваших лидеров оказались в Tleilaxu Tanks. Затем можно воскрешать по одному за раунд, пока все не вернутся; ждать повторной гибели всех пяти после первого воскрешения не нужно. Цена одного лидера — его боевая сила в спайсе, независимо от воскрешения войск.');
  leaders += note('Повторно погибшего воскрешённого лидера кладите лицом вниз: он недоступен для обычного повторного воскрешения, пока остальные доступные лидеры не пройдут свой цикл воскрешения и гибели.');
  if (f === 'Ecaz') leaders += note('Duke Vidal можно воскресить за 5 спайса независимо от числа погибших лидеров. Обычное воскрешение Ecaz открывается при как минимум 5 лидерах в Tanks, считая Duke Vidal.');
  if (f === 'CHOAM' && g.advanced) leaders += note('Auditor можно воскресить как одного лидера за раунд, даже если остальные живы. Цена равна его силе. Он не может стать Ghola Тлейлаксу.');
  if (f === 'Atreides' && g.advanced) leaders += note('Kwisatz Haderach воскрешается как лидер; жив он или мёртв, он не учитывается при проверке доступности обычных лидеров Атрейдесов.');
  if (g.advanced && g.selected.includes('Harkonnen')) leaders += note('Если один ваш лидер в плену у Харконненов, а остальные 4 — в Tanks, все лидеры недоступны: можно воскрешать по одному по обычным правилам. Когда все собственные лидеры Харконненов погибли, они немедленно возвращают пленных владельцам.');
  if (hasTleilaxu && f !== 'Tleilaxu') leaders += note('Если в Tanks меньше 5 ваших лидеров, Тлейлаксу могут по запросу воскресить конкретного лидера, даже лежащего лицом вниз, за согласованную цену (включая 0). Не более одного лидера вашей фракции за раунд. Когда все 5 в Tanks, действуют обычные правила; союзная скидка Тлейлаксу — половина цены с округлением вверх. Договорная цена вводится отдельно, повторно не делится.');
  if (f === 'Tleilaxu' && g.advanced) leaders += note('Gholas: если у вас меньше 5 живых лидеров, можно воскресить чужих погибших лидеров по своей скидке и добавить в свой пул, пока живых не станет 5. Для расчёта выберите обычного лидера и укажите его силу.');
  leaders += select(id + '-leader-type', types, 'none', 'Воскрешение лидера');
  if (type !== 'none') {
    const fixed = type === 'vidal' ? 5 : type === 'zoal' ? 3 : null;
    const entered = v(id + '-leader-price', '');
    if (fixed === null) leaders += `<p>${type === 'early' ? 'Согласованная цена' : 'Боевая сила лидера'}:</p><input class="field" type="number" min="0" step="1" data-value="${esc(id)}-leader-price" value="${esc(entered)}" aria-label="${type === 'early' ? 'Согласованная цена' : 'Боевая сила лидера'}">`;
    leaders += '<div data-leader-price>' + leaderPrice(s) + '</div>';
  }
  return skip + `<h2>${N[f]}</h2>` + panel('Revival · войска', troops) + panel('Revival · лидеры', leaders) + (f === 'Ecaz' ? ecazAmbassadors() : '');
}
