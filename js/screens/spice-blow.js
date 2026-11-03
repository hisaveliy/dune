import { state } from "../state.js";
import { N } from "../data.js";
import { check, esc, note, panel, select, v } from "../ui.js";

export function spiceBlow(step) {
  const id = 'r' + step.r + 'p1' + step.part;
  const has = faction => state.g.selected.includes(faction);
  const options = [['spice', 'Обычный Spice Blow'], ['worm', 'Shai-Hulud']];
  if (state.g.modules.discovery) options.push(['great', 'Great Maker'], ['discovery', 'Discovery Token']);
  options.push(['other', 'Другой / следующий эффект']);
  const selected = v(id + '-type', 'spice');
  const type = options.some(([value]) => value === selected) ? selected : 'spice';
  const item = (name, text) => check(id + '-' + type + '-' + name, text);
  const factionPanel = (faction, text) => panel(N[faction], text);
  let content = '';

  if (type === 'spice') {
    content = item('territory', 'Определите территорию, сектор и количество спайса по открытой карте.')
      + item('storm', 'Если сектор с символом Spice Blow под бурей, не размещайте спайс; иначе добавьте указанное на карте количество из банка.')
      + item('discard', 'Положите карту лицом вверх в текущую стопку сброса. Обычный Spice Blow не уничтожает находящиеся там войска и спайс.');
  } else if (type === 'discovery') {
    const kind = v(id + '-discovery-kind', 'hiereg');
    content = `<label>Тип жетона на карте:${select(id + '-discovery-kind', [['hiereg', 'Hiereg'], ['smuggler', 'Smuggler']], 'hiereg')}</label>`
      + item('clear', 'В территории Spice Blow, указанной на карте, уберите прежний спайс в банк, а все войска — в Tanks, включая Фременов и советниц. Это особый эффект Discovery Spice Card.')
      + item('spice', 'Разместите 6 спайса в указанном секторе Spice Blow, если он не под бурей.')
      + check(id + '-discovery-' + kind + '-place', 'Случайно возьмите закрытый жетон ' + (kind === 'hiereg' ? 'Hiereg' : 'Smuggler') + ' и положите лицом вниз в территорию и сектор, указанные для жетона на карте. Место жетона и место Spice Blow могут различаться.')
      + item('reveal', 'Не раскрывайте жетон сейчас. Во время Spice Collection фракция с войсками, не являющимися советницами, в его территории может посмотреть жетон и решить, раскрывать ли его.');
    if (has('Fremen')) content += factionPanel('Fremen', item('fremen-losses', 'Иммунитет Фременов к червям не защищает от Discovery Spice Blow: их войска в указанной территории также уходят в Tanks.')
      + (kind === 'hiereg' ? check(id + '-discovery-hiereg-fremen', 'Фремены могут посмотреть закрытый Hiereg в любое время, не раскрывая его остальным.') : ''));
    if (has('Guild') && kind === 'smuggler') content += factionPanel('Guild', check(id + '-discovery-smuggler-guild', 'Гильдия может посмотреть закрытый Smuggler в любое время, не раскрывая его остальным.'));
    if (has('Bene Gesserit') && state.g.advanced) content += factionPanel('Bene Gesserit', item('advisors', 'Советницы в территории Discovery Spice Blow также уничтожаются; мирное сосуществование от этого эффекта не защищает.'));
  } else if (type === 'worm' || type === 'great') {
    if (step.r === 1) {
      content = note('В первом раунде Shai-Hulud (включая Great Maker, который считается Shai-Hulud) не действует и не вызывает Nexus.')
        + item('aside', 'Отложите карту червя без применения эффекта и продолжайте открывать карты до карты территории.')
        + item('shuffle', 'В конце фазы замешайте отложенные карты червей обратно в Spice Deck.');
    } else {
      const additional = type === 'worm' && v(id + '-worm-order', 'first') === 'additional';
      if (type === 'worm') content += `<label>Червь в этой стопке:${select(id + '-worm-order', [['first', 'Первый'], ['additional', 'Дополнительный']], 'first')}</label>`;
      if (additional && !(has('Fremen') && state.g.advanced)) {
        content += item('additional', 'Сбросьте дополнительную карту Shai-Hulud и продолжайте открывать карты до карты территории.');
      } else {
        content += item('target', additional ? 'Фремены могут выбрать любую песчаную территорию для дополнительного червя.' : 'Определите предыдущую территорию Spice Blow в этой же стопке сброса, а не в другой стопке.')
          + item('losses', 'Верните спайс из затронутой территории в банк; войска отправьте в Tanks' + (has('Fremen') ? ', кроме защищённых Фременов и союзника, которого они решили защитить.' : '.'));
      }
      content += item('continue', 'Продолжайте открывать карты до карты территории и разрешите её Spice Blow.');
      if (type === 'great') {
        const votes = state.g.selected.map(faction => ({ faction, vote: v(id + '-great-vote-' + faction, '') }));
        const yes = votes.filter(x => x.vote === 'yes').length;
        const waiting = votes.filter(x => !x.vote).length;
        content += '<div class="section">Голосование за Nexus · в порядке бури</div>';
        content += votes.map(({ faction }) => `<label>${esc(N[faction])}${select(id + '-great-vote-' + faction, [['', 'Голос не указан'], ['yes', 'За Nexus'], ['no', 'Против Nexus']], '')}</label>`).join('');
        const result = waiting ? 'Осталось голосов: ' + waiting + '.' : yes > votes.length / 2 ? 'Большинство за Nexus.' : yes === votes.length / 2 ? 'Ничья: Nexus не происходит.' : 'Большинства за нет: Nexus не происходит.';
        content += note('За: ' + yes + ' из ' + votes.length + '. ' + result)
          + item('vote', 'Примените результат голосования: Nexus происходит только при строгом большинстве голосов «за».');
      } else {
        content += item('nexus', 'Разрешите Nexus после обработки карт этой стопки' + (state.g.alliances ? ': игроки могут публично заключать и разрывать альянсы согласно правилам партии.' : '. Альянсы выключены в настройках партии.'));
      }
      if (has('Fremen') && (!additional || state.g.advanced)) content += factionPanel('Fremen', item('protection', 'Фремены не пожираются червём и могут решить, защищать ли своего союзника.')
        + item('ride', type === 'great' ? 'После Great Maker Фремены могут переместить любое количество своих войск из резерва в одну допустимую территорию, соблюдая бурю и лимит присутствия фракций. Это заменяет обычную поездку с поля или размещение жетона червя.' : 'После Nexus Фремены могут перевезти часть или все свои войска из затронутой территории в одну допустимую территорию, соблюдая бурю и лимит присутствия фракций. Союзник не получает права ездить на черве.')
        + (type === 'great' ? note('Karama против войск Фременов в пожираемой территории не отменяет поездку их войск из резерва на Great Maker.') : ''));
      if (has('Ixians')) content += factionPanel('Ixians', item('stronghold', 'Войска внутри Hidden Mobile Stronghold защищены от червей; войска снаружи этой крепости защищёнными не считаются.'));
      if (state.g.modules.discovery) content += note('Войска внутри раскрытых Discovery-локаций защищены от червей. Локация считается отдельной территорией.');
    }
  } else {
    content = item('card', 'Прочитайте текст конкретной карты и примените её эффект и прямо указанные исключения.')
      + item('continue', 'Если эффект требует открыть следующую карту, продолжайте обработку этой стопки.');
  }

  const advisors = has('Bene Gesserit') && state.g.advanced ? factionPanel('Bene Gesserit', check('r' + step.r + 'p1-fighters', 'После завершения всей фазы Spice Blow & Nexus проверьте решение о перевороте советниц в бойцов по правилам Bene Gesserit.')) : '';
  return panel('Spice Blow · стопка ' + step.part, `
    <label>Открытое событие:${select(id + '-type', options, type)}</label>
    ${content}
    ${advisors}`);
}
