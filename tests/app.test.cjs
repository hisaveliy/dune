const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const store = 'dune_companion_release_1';

async function createApp(saved = []) {
  let now = 100000;
  let interval;
  const storage = new Map([[store, JSON.stringify(saved)]]);
  const handlers = {};
  const clocks = {};
  const app = {
    innerHTML: '',
    addEventListener(type, callback) { handlers[type] = callback; },
    querySelector(selector) {
      const kind = selector.match(/data-clock=(\w+)/)?.[1];
      if (!app.innerHTML.includes(`data-clock="${kind}"`)) return null;
      return clocks[kind] ||= { textContent: '' };
    }
  };
  class Clock extends Date { static now() { return now; } }
  const context = vm.createContext({
    document: { getElementById: () => app },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    Date: Clock,
    setInterval(callback) { interval = callback; },
    navigator: {},
    location: { protocol: 'file:' }
  });
  const modules = new Map();
  function load(filename) {
    if (!modules.has(filename)) {
      modules.set(filename, new vm.SourceTextModule(fs.readFileSync(filename, 'utf8'), {
        context, identifier: filename
      }));
    }
    return modules.get(filename);
  }
  const entry = load(path.join(root, 'js/app.js'));
  await entry.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier)));
  await entry.evaluate();

  function buttons() { return [...app.innerHTML.matchAll(/<button\b([^>]*)>/g)]; }
  function click(attribute, value) {
    const button = buttons().find(match => match[1].includes(`data-${attribute}="${value}"`) && !/\bdisabled\b/.test(match[1]));
    assert.ok(button, `Button ${attribute}=${value} exists`);
    assert.ok(!/\bdisabled\b/.test(button[1]), `Button ${attribute}=${value} is enabled`);
    const dataset = {};
    for (const match of button[1].matchAll(/data-([\w-]+)="([^"]*)"/g)) {
      dataset[match[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = match[2];
    }
    handlers.click({ target: { closest: () => ({ dataset }) } });
  }
  return {
    app, clocks, click,
    action: value => click('action', value),
    games: () => JSON.parse(storage.get(store)),
    game: () => JSON.parse(storage.get(store))[0],
    change(dataset, value) {
      handlers.change({ target: { dataset, checked: value, value } });
    },
    input(dataset, value) { handlers.input({ target: { dataset, value } }); },
    tick(ms) { now += ms; interval(); },
    async prepare() {
      this.action('settings');
      this.action('setup');
      assert.match(app.innerHTML, /data-action="start" disabled/);
      for (const tab of ['general', ...this.game().selected]) {
        click('prep', tab);
        for (const match of [...app.innerHTML.matchAll(/data-check="([^"]+)"/g)]) {
          this.change({ check: match[1] }, true);
        }
      }
      this.action('start');
      assert.equal(this.game().active, '1|0|shared|main');
    }
  };
}

test('creation, faction limits, settings, preparation and escaped player names', async () => {
  const a = await createApp();
  a.action('new');
  a.click('faction', 'Harkonnen');
  a.click('faction', 'Emperor');
  assert.equal(a.game().selected.length, 6);
  for (const faction of ['Fremen', 'Atreides', 'Ecaz', 'Moritani', 'CHOAM']) a.click('faction', faction);
  assert.equal(a.game().selected.length, 2);
  const first = a.game().selected[0];
  a.click('order', '0');
  assert.notEqual(a.game().selected[0], first);
  a.input({ player: first }, '<Alice & Bob>');
  a.action('settings');
  a.change({ check: 'advanced' }, false);
  a.change({ check: 'module-tech' }, false);
  a.action('create');
  assert.match(a.app.innerHTML, /&lt;Alice &amp; Bob&gt;/);
  assert.equal(a.game().advanced, false);
  assert.equal(a.game().modules.tech, false);
  await a.prepare();
  assert.equal(a.game().started, true);
});

test('back/next accumulate time, pause and saving/loading preserve progress', async () => {
  const a = await createApp();
  a.action('new');
  await a.prepare();
  a.tick(3000);
  assert.equal(a.clocks.step.textContent, '00:00:03');
  a.action('next');
  a.tick(2000);
  a.action('back');
  a.tick(4000);
  a.action('next');
  assert.equal(a.game().elapsed['1|0|shared|main'], 7000);
  assert.equal(a.game().elapsed['1|1|shared|A'], 2000);
  a.action('pause');
  const elapsed = a.game().elapsed;
  a.tick(5000);
  a.action('pause');
  assert.deepEqual(a.game().elapsed, elapsed);
  a.action('next');
  a.action('next');
  await reach(a, 1, 4);
  a.tick(2000);
  assert.equal(a.clocks.phase.textContent, '00:00:02');
  assert.equal(a.clocks.step.textContent, '00:00:02');
  a.action('home');
  const saved = a.game();
  const reloaded = await createApp(a.games());
  reloaded.action('saved');
  reloaded.click('load', saved.id);
  assert.equal(reloaded.game().cursor, saved.cursor);
  assert.deepEqual(reloaded.game().elapsed, saved.elapsed);
  assert.equal(reloaded.game().paused, true);
});

test('all 12 factions, nine phases, statistics and ten rounds retain their behavior', async () => {
  const groups = [
    ['Atreides', 'Harkonnen', 'Fremen', 'Emperor', 'Guild', 'Bene Gesserit'],
    ['Ixians', 'Tleilaxu', 'CHOAM', 'Richese', 'Ecaz', 'Moritani']
  ];
  for (const selected of groups) {
    const a = await createApp();
    a.action('new');
    // Select through the same faction buttons used by players.
    for (const faction of a.game().selected) {
      if (!selected.includes(faction)) a.click('faction', faction);
    }
    for (const faction of selected) {
      if (!a.game().selected.includes(faction)) a.click('faction', faction);
    }
    await a.prepare();
    const seen = new Set();
    let statistics = 0;
    for (let guard = 0; !a.game().finished; guard++) {
      assert.ok(guard < 500);
      const g = a.game();
      if (g.phase === 9) {
        statistics++;
        const elapsed = g.elapsed;
        a.tick(10000);
        assert.deepEqual(a.game().elapsed, elapsed);
        for (const tab of ['phases', 'players', 'rounds']) a.click('tab', tab);
        a.action('back');
        assert.equal(a.game().phase, 8);
        a.tick(1000);
        a.action('next');
      } else {
        seen.add(g.phase);
        const checkbox = a.app.innerHTML.match(/data-check="([^"]+)"/);
        if (checkbox) a.change({ check: checkbox[1] }, true);
        const field = a.app.innerHTML.match(/<select[^>]+data-value="([^"]+)"[^>]*>[\s\S]*?<option value="([^"]*)"/);
        if (field) a.change({ value: field[1] }, field[2]);
        const number = a.app.innerHTML.match(/data-number="([^"]+)"/);
        if (number) a.click('number', number[1]);
        a.tick(1000);
      }
      a.action('next');
    }
    assert.equal(statistics, 10);
    assert.equal(seen.size, 9);
    assert.match(a.app.innerHTML, /Партия завершена/);
    assert.equal(a.game().active, null);
    a.action('back');
    assert.match(a.app.innerHTML, /<h3>Mentat Pause<\/h3>/);
  }
});

test('every local asset and ES module import is included in the offline cache', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const assets = JSON.parse(sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]);
  const files = ['index.html', 'css/styles.css', ...fs.readdirSync(path.join(root, 'js'), { recursive: true }).filter(name => name.endsWith('.js')).map(name => 'js/' + name)];
  for (const filename of files) {
    assert.ok(assets.includes('./' + filename), `Cached: ${filename}`);
    for (const match of fs.readFileSync(path.join(root, filename), 'utf8').matchAll(/from "(\.[^"]+)"/g)) {
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(filename), match[1])), `Import exists: ${match[1]}`);
    }
  }
  for (const asset of assets) assert.ok(fs.existsSync(path.resolve(root, asset)), `Asset exists: ${asset}`);
});

async function gameWith(selected, overrides = {}) {
  const a = await createApp();
  a.action('new');
  return { ...a.game(), selected, ...overrides };
}

async function resume(game) {
  const a = await createApp([game]);
  a.action('saved');
  a.click('load', game.id);
  return a;
}

async function reach(a, round, phase) {
  for (let guard = 0; a.game().round !== round || a.game().phase !== phase; guard++) {
    assert.ok(guard < 500, `Reach round ${round}, phase ${phase}`);
    if (round === 1 && phase === 4 && a.game().round === 1 && a.game().phase === 5) a.action('back');
    else a.action('next');
  }
}

test('settings remain readable when enabled; preparation keeps completed checklist styling and filters absent factions', async () => {
  for (const selected of [['Atreides', 'Harkonnen'], ['Atreides', 'Ixians'], ['Atreides', 'Emperor']]) {
    const a = await resume(await gameWith(selected));
    a.action('settings');
    assert.doesNotMatch(a.app.innerHTML, /class="completed"/);
    a.action('setup');
    assert.doesNotMatch(a.app.innerHTML, /data-check="general-treachery"/);
    assert.doesNotMatch(a.app.innerHTML, /исключение Иксиан|исключение Харконненов/);
    a.change({ check: 'general-board' }, true);
    assert.match(a.app.innerHTML, /class="completed">Поле/);
  }
});

test('Spice Blow checklists change by event, round, module and participating factions', async () => {
  const a = await resume(await gameWith(['Atreides', 'Fremen', 'Guild', 'Bene Gesserit'], { started: true }));
  a.action('next');
  a.change({ value: 'r1p1A-type' }, 'worm');
  assert.match(a.app.innerHTML, /В первом раунде.*не вызывает Nexus/);
  assert.doesNotMatch(a.app.innerHTML, /data-value="r1p1A-great-vote/);
  a.change({ value: 'r1p1A-type' }, 'discovery');
  assert.match(a.app.innerHTML, /6 спайса/);
  assert.match(a.app.innerHTML, /включая Фременов и советниц/);
  assert.match(a.app.innerHTML, /Hiereg.*не раскрывая/);
  a.change({ value: 'r1p1A-discovery-kind' }, 'smuggler');
  assert.match(a.app.innerHTML, /Гильдия.*Smuggler.*не раскрывая/);
  assert.doesNotMatch(a.app.innerHTML, /Moritani|Иксиан/);
  await reach(a, 2, 1);
  a.change({ value: 'r2p1A-type' }, 'great');
  for (const faction of a.game().selected.slice(0, 2)) a.change({ value: 'r2p1A-great-vote-' + faction }, 'yes');
  for (const faction of a.game().selected.slice(2)) a.change({ value: 'r2p1A-great-vote-' + faction }, 'no');
  assert.match(a.app.innerHTML, /Ничья: Nexus не происходит/);
  a.change({ value: 'r2p1A-great-vote-Guild' }, 'yes');
  assert.match(a.app.innerHTML, /Большинство за Nexus/);
  assert.match(a.app.innerHTML, /из резерва/);
  const disabled = await resume(await gameWith(['Atreides', 'Emperor'], {
    started: true, modules: { discovery: false, tech: false, stronghold: false }
  }));
  disabled.action('next');
  assert.doesNotMatch(disabled.app.innerHTML, /value="discovery"|value="great"/);
});

test('Charity is shared and calculates CHOAM payouts, Bene Gesserit and both inflation orders', async () => {
  for (const first of ['double', 'cancel']) {
    const a = await resume(await gameWith(['CHOAM', 'Atreides', 'Fremen', 'Bene Gesserit'], { started: true }));
    await reach(a, 1, 2);
    assert.equal(a.game().active, '1|2|shared|main');
    assert.doesNotMatch(a.app.innerHTML, /Charity завершена/);
    a.change({ value: 'r1p2Atreides-bracket' }, '0');
    a.change({ value: 'r1p2Fremen-bracket' }, '1');
    a.change({ value: 'r1p2Bene Gesserit-bracket' }, '2');
    assert.match(a.app.innerHTML, /data-charity="Atreides">2</);
    assert.match(a.app.innerHTML, /data-charity="Fremen">1</);
    assert.match(a.app.innerHTML, /data-charity="Bene Gesserit">2</);
    assert.match(a.app.innerHTML, /data-choam-income>8</);
    assert.match(a.app.innerHTML, /data-choam-remaining>3</);
    a.change({ value: 'r1p2CHOAM-stock' }, '7');
    assert.match(a.app.innerHTML, /data-choam-total>10</);
    a.input({ value: 'r1p2CHOAM-stock' }, '12');
    assert.equal(a.game().values['r1p2CHOAM-stock'], 12);
    a.input({ value: 'r1p2CHOAM-stock' }, '');
    assert.equal(a.game().values['r1p2CHOAM-stock'], '');
    a.tick(2000);
    a.action('next');
    assert.equal(a.game().phase, 3);
    a.action('back');
    assert.equal(a.clocks.step.textContent, '00:00:02');
    await reach(a, 1, 8);
    a.change({ value: 'r1p8-inflation' }, first);
    for (let round = 2; round <= 4; round++) {
      await reach(a, round, 2);
      const factor = round === 4 ? 1 : (round === 2 ? first === 'double' : first !== 'double') ? 2 : 0;
      a.change({ value: `r${round}p2Atreides-bracket` }, '0');
      a.change({ value: `r${round}p2Fremen-bracket` }, '1');
      assert.match(a.app.innerHTML, new RegExp(`data-charity="Atreides">${2 * factor}<`));
      assert.match(a.app.innerHTML, new RegExp(`data-charity="Fremen">${factor}<`));
      assert.match(a.app.innerHTML, new RegExp(`data-charity="Bene Gesserit">${2 * factor}<`));
      assert.match(a.app.innerHTML, new RegExp(`data-choam-income>${8 * factor}<`));
      a.action('home');
      a.action('saved');
      a.click('load', a.game().id);
      assert.match(a.app.innerHTML, new RegExp(`data-choam-income>${8 * factor}<`));
      await reach(a, round, 8);
      assert.doesNotMatch(a.app.innerHTML, /data-value="r\dp8-inflation"/);
    }
  }
});

test('Bidding preparation has actual tasks, normal auction rules and Richese exceptions', async () => {
  for (const richese of [false, true]) {
    const a = await resume(await gameWith(richese ? ['Richese', 'Atreides'] : ['Atreides', 'Emperor'], { started: true }));
    await reach(a, 1, 3);
    assert.match(a.app.innerHTML, /data-check="r1p3-hands"/);
    assert.match(a.app.innerHTML, /data-check="r1p3-cards"/);
    assert.doesNotMatch(a.app.innerHTML, /Этап торгов завершён/);
    assert.match(a.app.innerHTML, /все.*пас.*обычные торги завершаются/);
    assert.equal(a.app.innerHTML.includes('Once Around'), richese);
    assert.equal(a.app.innerHTML.includes('Black Market'), richese);
    if (richese) assert.ok(a.app.innerHTML.indexOf('Black Market') < a.app.innerHTML.indexOf('data-check="r1p3-hands"'));
    a.action('next');
    assert.equal(a.game().phase, 5);
    assert.doesNotMatch(a.app.innerHTML, /Этап торгов завершён/);
  }
});

test('legacy Charity cursors migrate once while preserving historic player time and inputs', async () => {
  for (const [cursor, expectedCursor, phase] of [[33, 27, 2], [35, 28, 3], [55, 47, 9]]) {
    const legacy = await gameWith(['Fremen', 'Atreides', 'Harkonnen', 'Emperor'], {
      started: true, cursor, round: 2, phase,
      values: { 'r2p2Atreides-bracket': '1' },
      elapsed: { '2|2|Atreides|main': 7000, '1|0|shared|main': 3000 }
    });
    delete legacy.timelineVersion;
    const a = await resume(legacy);
    assert.equal(a.game().cursor, expectedCursor);
    assert.equal(a.game().timelineVersion, 3);
    assert.deepEqual(a.game().elapsed, legacy.elapsed);
    assert.equal(a.game().values['r2p2Atreides-bracket'], '1');
    if (phase !== 9) a.action('home');
    const again = await resume(a.game());
    assert.equal(again.game().cursor, expectedCursor);
    for (const [key, time] of Object.entries(legacy.elapsed)) assert.equal(again.game().elapsed[key], time);
  }
});

test('Charity without CHOAM uses bank payouts and Bene Gesserit only get automatic Charity in Advanced', async () => {
  for (const advanced of [false, true]) {
    const a = await resume(await gameWith(['Atreides', 'Bene Gesserit'], { started: true, advanced }));
    await reach(a, 1, 2);
    a.change({ value: 'r1p2Atreides-bracket' }, '1');
    assert.match(a.app.innerHTML, /data-charity="Atreides">1</);
    assert.match(a.app.innerHTML, new RegExp(`data-charity="Bene Gesserit">${advanced ? 2 : 0}<`));
    assert.doesNotMatch(a.app.innerHTML, /data-choam-income|data-choam-remaining/);
    a.change({ value: 'r1p2Bene Gesserit-bracket' }, '0');
    assert.match(a.app.innerHTML, /data-charity="Bene Gesserit">2</);
    a.action('next');
    assert.equal(a.game().phase, 3);
    a.action('back');
    assert.equal(a.game().phase, 2);
  }
});

test('event checklist state persists independently, and Richese Black Market is Advanced only', async () => {
  const a = await resume(await gameWith(['Richese', 'Fremen'], { started: true, advanced: false }));
  a.action('next');
  a.change({ value: 'r1p1A-type' }, 'discovery');
  a.change({ check: 'r1p1A-discovery-spice' }, true);
  a.change({ value: 'r1p1A-type' }, 'spice');
  assert.doesNotMatch(a.app.innerHTML, /data-check="r1p1A-spice-storm" checked/);
  a.change({ value: 'r1p1A-type' }, 'discovery');
  assert.match(a.app.innerHTML, /data-check="r1p1A-discovery-spice" checked/);
  a.action('home');
  const loaded = await resume(a.game());
  assert.match(loaded.app.innerHTML, /data-check="r1p1A-discovery-spice" checked/);
  await reach(loaded, 1, 3);
  assert.match(loaded.app.innerHTML, /Once Around/);
  assert.doesNotMatch(loaded.app.innerHTML, /Black Market/);
});

test('Atreides prescience appears only at the first Shipment step of each round', async () => {
  const a = await resume(await gameWith(['Fremen', 'Atreides'], {
    started: true, checks: { 'r1p1-prescience': true }
  }));
  await reach(a, 1, 1);
  assert.doesNotMatch(a.app.innerHTML, /prescience|верхнюю карту Spice Deck/);
  a.action('next');
  assert.doesNotMatch(a.app.innerHTML, /prescience|верхнюю карту Spice Deck/);
  await reach(a, 1, 5);
  assert.equal(a.game().active, '1|5|Fremen|ship');
  assert.match(a.app.innerHTML, /data-check="r1p5-prescience"/);
  assert.doesNotMatch(a.app.innerHTML, /data-check="r1p5-prescience" checked/);
  assert.ok(a.app.innerHTML.indexOf('data-check="r1p5-prescience"') < a.app.innerHTML.indexOf('Количество войск'));
  a.change({ check: 'r1p5-prescience' }, true);
  a.action('next');
  assert.doesNotMatch(a.app.innerHTML, /prescience/);
  a.action('next');
  assert.equal(a.game().active, '1|5|Atreides|ship');
  assert.doesNotMatch(a.app.innerHTML, /prescience/);
  a.action('home');
  const loaded = await resume(a.game());
  loaded.action('back');
  loaded.action('back');
  assert.match(loaded.app.innerHTML, /data-check="r1p5-prescience" checked/);
  await reach(loaded, 2, 5);
  assert.match(loaded.app.innerHTML, /data-check="r2p5-prescience"/);
  assert.doesNotMatch(loaded.app.innerHTML, /data-check="r2p5-prescience" checked/);

  const absent = await resume(await gameWith(['Fremen', 'Emperor'], { started: true }));
  await reach(absent, 1, 5);
  assert.doesNotMatch(absent.app.innerHTML, /prescience|Атрейдесы/);
});

test('first-round Revival can be skipped, with elapsed time and the return position preserved', async () => {
  const a = await resume(await gameWith(['Fremen', 'Atreides', 'Ecaz'], { started: true }));
  await reach(a, 1, 4);
  assert.match(a.app.innerHTML, /data-action="skip-revival"/);
  assert.match(a.app.innerHTML, /Ecaz.*послов/);
  a.tick(3000);
  a.action('skip-revival');
  assert.equal(a.game().active, '1|5|Fremen|ship');
  assert.equal(a.game().elapsed['1|4|Fremen|main'], 3000);
  assert.equal(a.game().elapsed['1|4|Atreides|main'], undefined);
  assert.equal(a.game().elapsed['1|4|Ecaz|main'], undefined);
  assert.match(a.app.innerHTML, /data-check="r1p5-prescience"/);
  a.action('home');
  const loaded = await resume(a.game());
  loaded.action('back');
  assert.equal(loaded.game().active, '1|4|Fremen|main');
  assert.equal(loaded.clocks.step.textContent, '00:00:03');
  loaded.action('next');
  assert.equal(loaded.game().active, '1|4|Atreides|main');
  loaded.action('skip-revival');
  loaded.action('back');
  assert.equal(loaded.game().active, '1|4|Atreides|main');
  loaded.action('next');
  loaded.action('next');
  loaded.action('back');
  assert.equal(loaded.game().active, '1|4|Ecaz|main');
  await reach(loaded, 2, 4);
  assert.doesNotMatch(loaded.app.innerHTML, /data-action="skip-revival"/);
  assert.match(loaded.app.innerHTML, /Воскресить войск/);
});

test('Fremen Shipment explains its landing area without a stronghold price selector', async () => {
  for (const advanced of [false, true]) {
    const a = await resume(await gameWith(['Fremen', 'Atreides'], {
      started: true, advanced,
      values: { 'r1p5Fremen-count': 3, 'r1p5Fremen-destination': 'other' }
    }));
    await reach(a, 1, 5);
    assert.doesNotMatch(a.app.innerHTML, /data-value="r1p5Fremen-destination"/);
    assert.match(a.app.innerHTML, /Great Flat.*не более двух территорий/);
    assert.match(a.app.innerHTML, /одну.*территорию/);
    assert.match(a.app.innerHTML, /data-shipment-cost>0</);
    assert.equal(a.app.innerHTML.includes('половину высаживаемых войск'), advanced);
    assert.doesNotMatch(a.app.innerHTML, /No-Field/);
    a.tick(2000);
    a.action('next');
    a.action('back');
    assert.equal(a.game().values['r1p5Fremen-count'], 3);
    assert.equal(a.game().values['r1p5Fremen-destination'], 'other');
    assert.doesNotMatch(a.app.innerHTML, /data-check="r1p5Fremen-ship"/);
    assert.equal(a.clocks.step.textContent, '00:00:02');
  }
});

test('ordinary and Guild Shipment retain the destination selector and prices', async () => {
  const a = await resume(await gameWith(['Atreides', 'Guild'], {
    started: true, values: { 'r1p5Atreides-count': 3, 'r1p5Guild-count': 3 }
  }));
  await reach(a, 1, 5);
  assert.match(a.app.innerHTML, /data-value="r1p5Atreides-destination"/);
  assert.match(a.app.innerHTML, /data-shipment-cost>3</);
  a.change({ value: 'r1p5Atreides-destination' }, 'other');
  assert.match(a.app.innerHTML, /data-shipment-cost>6</);
  a.action('next');
  a.action('next');
  assert.match(a.app.innerHTML, /data-value="r1p5Guild-destination"/);
  assert.match(a.app.innerHTML, /data-shipment-cost>2</);
  a.change({ value: 'r1p5Guild-destination' }, 'other');
  assert.match(a.app.innerHTML, /data-shipment-cost>3</);
});

test('Shipment shows a prominent price card and the correct payment recipient', async () => {
  for (const guild of [false, true]) {
    const a = await resume(await gameWith(guild ? ['Atreides', 'Guild'] : ['Atreides', 'Emperor'], {
      started: true, values: { 'r1p5Atreides-count': 4, 'r1p5Atreides-destination': 'other', 'r1p5Guild-count': 4 }
    }));
    await reach(a, 1, 5);
    assert.match(a.app.innerHTML, /class="timerPanel" aria-label="Стоимость высадки"/);
    assert.match(a.app.innerHTML, /data-shipment-cost>8</);
    assert.match(a.app.innerHTML, guild ? /Оплата: Гильдии/ : /Оплата: в банк спайса/);
    a.change({ value: 'r1p5Atreides-destination' }, 'hold');
    assert.match(a.app.innerHTML, /data-shipment-cost>4</);
    a.action('next');
    a.action('next');
    if (guild) {
      assert.match(a.app.innerHTML, /data-shipment-cost>2</);
      assert.match(a.app.innerHTML, /Оплата: в банк спайса/);
      assert.doesNotMatch(a.app.innerHTML, /Оплата: Гильдии/);
    }
  }
  const fremen = await resume(await gameWith(['Fremen', 'Guild'], { started: true, values: { 'r1p5Fremen-count': 4 } }));
  await reach(fremen, 1, 5);
  assert.match(fremen.app.innerHTML, /data-shipment-cost>0</);
  assert.match(fremen.app.innerHTML, /Оплата не требуется/);
  assert.doesNotMatch(fremen.app.innerHTML, /Оплата: Гильдии/);
});

test('Mentat shows the Fremen special-victory reminder only in round ten', async () => {
  const a = await resume(await gameWith(['Fremen', 'Ecaz'], { started: true, checks: { 'r10-mentat-Fremen': true } }));
  for (let round = 1; round <= 10; round++) {
    await reach(a, round, 8);
    assert.equal(a.app.innerHTML.includes('В конце 10-го раунда — специальная победа.'), round === 10);
    assert.match(a.app.innerHTML, /<strong>Ecaz<\/strong>/);
    assert.doesNotMatch(a.app.innerHTML, /data-check="r\d+-mentat-/);
    for (const module of ['discovery', 'strong', 'tech']) {
      assert.match(a.app.innerHTML, new RegExp(`data-check="r${round}p8-${module}"`));
    }
    if (round < 10) assert.doesNotMatch(a.app.innerHTML, /В конце 10-го раунда — специальная победа/);
  }
  a.action('next');
  a.action('back');
  assert.match(a.app.innerHTML, /В конце 10-го раунда — специальная победа/);
  assert.equal(a.game().checks['r10-mentat-Fremen'], true);
});

test('round screens omit completion confirmations but retain concrete checklists and Mentat module guidance', async () => {
  const a = await resume(await gameWith(['Fremen', 'Atreides'], {
    started: true, checks: { 'r1p8-general': true, 'r1-mentat-Fremen': true, 'r1p5Fremen-ship': true }
  }));
  for (let guard = 0; a.game().phase !== 9; guard++) {
    assert.ok(guard < 50);
    assert.doesNotMatch(a.app.innerHTML, /Вся стопка обработана|Revival завершён|Высадка завершена или пропущена|Перемещение завершено или пропущено|Все сражения завершены|Весь сбор спайса завершён|Все применимые проверки завершены|Проверено \/ выполнено или неприменимо|Буря перемещена; последствия разрешены/);
    if (a.game().phase === 1) assert.match(a.app.innerHTML, /data-check="r1p1[AB]-spice-storm"/);
    if (a.game().phase === 3) assert.match(a.app.innerHTML, /data-check="r1p3-hands"/);
    if (a.game().phase === 4) assert.match(a.app.innerHTML, /ЦЕНА ВОСКРЕШЕНИЯ ВОЙСК/);
    if (a.game().phase === 7) assert.match(a.app.innerHTML, /Контроль Arrakeen/);
    if (a.game().phase === 8) {
      assert.match(a.app.innerHTML, /Jacurutu Sietch/);
      assert.match(a.app.innerHTML, /[Сс]оветниц/);
      assert.match(a.app.innerHTML, /один игрок.*все три Tech Token/);
      assert.match(a.app.innerHTML, /Жетоны двух союзников.*складывать нельзя/);
      for (const module of ['discovery', 'strong', 'tech']) assert.match(a.app.innerHTML, new RegExp(`data-check="r1p8-${module}"`));
      assert.doesNotMatch(a.app.innerHTML, /data-check="r1p8-general"/);
    }
    a.action('next');
  }
  assert.equal(a.game().checks['r1p8-general'], true);
  assert.equal(a.game().checks['r1p5Fremen-ship'], true);
});

test('Storm guidance distinguishes first-turn dials, Advanced Fremen cards and ordinary later dials', async () => {
  for (const fremen of [false, true]) {
    for (const advanced of [false, true]) {
      const a = await resume(await gameWith(fremen ? ['Atreides', 'Fremen'] : ['Atreides', 'Emperor'], { started: true, advanced }));
      assert.match(a.app.innerHTML, /Storm Start/);
      assert.match(a.app.innerHTML, /от 0 до 20/);
      assert.match(a.app.innerHTML, /против часовой стрелки/);
      assert.doesNotMatch(a.app.innerHTML, /Storm Cards применяются с учётом раунда/);
      assert.equal(a.app.innerHTML.includes('Подготовка карты на раунд 2'), fremen && advanced);
      assert.match(a.app.innerHTML, /Spice Deck.*следующей фазе Spice Blow/);
      assert.match(a.app.innerHTML, /Imperial Basin/);
      assert.match(a.app.innerHTML, /Первый игрок/);
      assert.doesNotMatch(a.app.innerHTML, /data-check=/);
      await reach(a, 2, 0);
      if (fremen && advanced) {
        assert.match(a.app.innerHTML, /Карта бури · Advanced с Фременами/);
        assert.match(a.app.innerHTML, /не выбирают нужное число/);
        assert.match(a.app.innerHTML, /Подготовка карты на раунд 3/);
        assert.match(a.app.innerHTML, /округляя потери вверх/);
        assert.doesNotMatch(a.app.innerHTML, /от 1 до 3/);
      } else {
        assert.match(a.app.innerHTML, /от 1 до 3/);
        assert.match(a.app.innerHTML, /последними использовали боевые диски/);
        assert.doesNotMatch(a.app.innerHTML, /Подготовка карты на раунд/);
      }
      a.tick(2000);
      a.action('next');
      a.action('back');
      assert.equal(a.game().phase, 0);
      assert.equal(a.clocks.step.textContent, '00:00:02');
    }
  }
});

test('starting Treachery is a separate faction task with exact card counts and the Ixian procedure', async () => {
  const groups = [
    ['Fremen', 'Atreides', 'Harkonnen', 'Guild', 'Ixians', 'Richese'],
    ['Emperor', 'Bene Gesserit', 'Tleilaxu', 'CHOAM', 'Ecaz', 'Moritani']
  ];
  for (const selected of groups) {
    const a = await resume(await gameWith(selected));
    assert.doesNotMatch(a.app.innerHTML, /data-check="general-treachery"/);
    assert.doesNotMatch(a.app.innerHTML, /стартовые Treachery/);
    for (const faction of selected) {
      a.click('prep', faction);
      const matches = [...a.app.innerHTML.matchAll(/data-check="([^"]+-treachery)"/g)];
      assert.deepEqual(matches.map(match => match[1]), [faction + '-treachery']);
      assert.match(a.app.innerHTML, faction === 'Harkonnen' ? /Получить 2 стартовые Treachery Cards/ : /Получить 1 стартовую Treachery Card/);
      if (faction === 'Ixians') {
        assert.match(a.app.innerHTML, /возьмите 6 карт/);
        assert.match(a.app.innerHTML, /выберите одну/);
        assert.match(a.app.innerHTML, /остальные.*перемешайте.*раздайте/);
      } else if (selected.includes('Ixians')) {
        assert.match(a.app.innerHTML, /раздачи Иксиан/);
        if (faction === 'Harkonnen') assert.match(a.app.innerHTML, /ещё одну.*сверху.*колоды/);
      } else {
        assert.doesNotMatch(a.app.innerHTML, /Иксиан/);
      }
      if (faction === 'Richese') assert.match(a.app.innerHTML, /10 специальных карт.*не входит в стартовую руку/);
      if (faction === 'Harkonnen') assert.equal((a.app.innerHTML.match(/2 стартовые Treachery Cards/g) || []).length, 1);
    }
  }
});

test('individual starting-card tasks contribute independently to readiness and persist on reload', async () => {
  const a = await resume(await gameWith(['Fremen', 'Harkonnen']));
  for (const tab of ['general', 'Fremen', 'Harkonnen']) {
    a.click('prep', tab);
    const ids = [...a.app.innerHTML.matchAll(/data-check="([^"]+)"/g)].map(match => match[1]);
    for (const id of ids.filter(id => !id.endsWith('-treachery'))) a.change({ check: id }, true);
  }
  assert.match(a.app.innerHTML, /Готово 15 \/ 17/);
  assert.match(a.app.innerHTML, /data-action="start" disabled/);
  a.change({ check: 'Harkonnen-treachery' }, true);
  assert.match(a.app.innerHTML, /Готово 16 \/ 17/);
  assert.match(a.app.innerHTML, /data-action="start" disabled/);
  a.click('prep', 'Fremen');
  a.change({ check: 'Fremen-treachery' }, true);
  assert.match(a.app.innerHTML, /Готово 17 \/ 17/);
  assert.doesNotMatch(a.app.innerHTML, /data-action="start" disabled/);
  a.action('settings');
  a.action('create');
  a.action('home');
  const loaded = await resume(a.game());
  assert.match(loaded.app.innerHTML, /Готово 17 \/ 17/);
  loaded.click('prep', 'Fremen');
  assert.match(loaded.app.innerHTML, /data-check="Fremen-treachery" checked/);
  loaded.change({ check: 'Fremen-treachery' }, false);
  assert.match(loaded.app.innerHTML, /data-action="start" disabled/);
  loaded.click('prep', 'Harkonnen');
  assert.match(loaded.app.innerHTML, /data-check="Harkonnen-treachery" checked/);
});

test('completed legacy general Treachery transfers once without overwriting individual choices', async () => {
  for (const dealt of [false, true]) {
    const legacy = await gameWith(['Fremen', 'Harkonnen'], {
      checks: { 'general-treachery': dealt, 'general-board': true, 'Harkonnen-treachery': false }
    });
    const a = await resume(legacy);
    assert.equal(a.game().checks['Fremen-treachery'], dealt);
    assert.equal(a.game().checks['Harkonnen-treachery'], false);
    assert.equal(a.game().checks['general-board'], true);
    a.click('prep', 'Fremen');
    a.change({ check: 'Fremen-treachery' }, !dealt);
    a.action('settings');
    a.action('create');
    a.action('home');
    const loaded = await resume(a.game());
    assert.equal(loaded.game().checks['Fremen-treachery'], !dealt);
    assert.equal(loaded.game().checks['Harkonnen-treachery'], false);
  }
});

test('Bidding is one screen between Charity and Revival, retaining preparation checks and time', async () => {
  const a = await resume(await gameWith(['Atreides', 'Richese'], { started: true }));
  await reach(a, 2, 2);
  a.action('next');
  assert.equal(a.game().active, '2|3|shared|main');
  assert.match(a.app.innerHTML, /data-check="r2p3-hands"/);
  assert.match(a.app.innerHTML, /Обычные торги/);
  assert.match(a.app.innerHTML, /Once Around/);
  assert.match(a.app.innerHTML, /Black Market/);
  a.change({ check: 'r2p3-hands' }, true);
  a.change({ check: 'r2p3-cards' }, true);
  a.tick(3000);
  a.action('next');
  assert.equal(a.game().phase, 4);
  a.action('back');
  assert.equal(a.game().active, '2|3|shared|main');
  assert.equal(a.clocks.step.textContent, '00:00:03');
  assert.match(a.app.innerHTML, /data-check="r2p3-hands" checked/);
  assert.match(a.app.innerHTML, /data-check="r2p3-cards" checked/);
  a.action('back');
  assert.equal(a.game().phase, 2);
});

test('both old Bidding steps and subsequent positions migrate from timeline versions one and two', async () => {
  for (const [version, cursor, target, phase] of [[1,35,28,3],[1,36,28,3],[2,29,28,3],[2,30,28,3],[1,37,29,4],[2,31,29,4]]) {
    const legacy = await gameWith(['Fremen','Atreides','Harkonnen','Emperor'], {
      started:true, timelineVersion:version, cursor, round:2, phase,
      checks:{'r2p3-hands':true,'r2p3-cards':true},
      elapsed:{'2|3|shared|prepare':3000,'2|3|shared|auction':5000}
    });
    const a = await resume(legacy);
    assert.equal(a.game().timelineVersion,3);
    assert.equal(a.game().cursor,target);
    assert.deepEqual(a.game().elapsed,legacy.elapsed);
    if (phase === 4) a.action('back');
    assert.equal(a.game().active,'2|3|shared|main');
    assert.equal(a.clocks.step.textContent,'00:00:08');
    assert.match(a.app.innerHTML,/data-check="r2p3-cards" checked/);
    a.tick(2000);
    a.action('home');
    const loaded = await resume(a.game());
    assert.equal(loaded.game().cursor,28);
    assert.equal(loaded.clocks.step.textContent,'00:00:10');
    assert.equal(loaded.game().elapsed['2|3|shared|prepare'],3000);
    assert.equal(loaded.game().elapsed['2|3|shared|auction'],5000);
    loaded.action('next');
    assert.equal(loaded.game().phase,4);
  }
});

function output(a, attribute) {
  return a.app.innerHTML.match(new RegExp('<output ' + attribute + '>([^<]+)</output>'))?.[1];
}

test('round one skips Revival by default and old saves retain history and manual access', async () => {
  const a = await resume(await gameWith(['Atreides', 'Ecaz'], { started: true }));
  await reach(a, 1, 3);
  a.tick(2000);
  a.action('next');
  assert.equal(a.game().active, '1|5|Atreides|ship');
  assert.match(a.app.innerHTML, /Ecaz · конец Revival/);
  assert.equal(Object.keys(a.game().elapsed).some(k => k.includes('|4|')), false);
  a.action('back');
  assert.equal(a.game().active, '1|4|Atreides|main');
  a.tick(3000);
  const manuallyOpened = await resume(a.game());
  assert.equal(manuallyOpened.game().active, '1|4|Atreides|main');
  assert.equal(manuallyOpened.clocks.step.textContent, '00:00:03');
  const legacy = a.game();
  delete legacy.values['r1p4-opened'];
  legacy.values['r1p4Atreides-troops'] = 3;
  const loaded = await resume(legacy);
  assert.equal(loaded.game().active, '1|5|Atreides|ship');
  assert.equal(loaded.game().elapsed['1|4|Atreides|main'], 3000);
  loaded.action('back');
  assert.equal(output(loaded, 'data-revival-cost'), '2');
});

test('all twelve factions have their own free allowance, force cap and visible Revival price', async () => {
  const cases = [
    ['Atreides',2,3,2], ['Harkonnen',2,3,2], ['Fremen',3,3,0],
    ['Emperor',1,3,4], ['Guild',1,3,4], ['Bene Gesserit',1,3,4],
    ['Ixians',1,3,4], ['Tleilaxu',2,20,1], ['CHOAM',0,20,3],
    ['Richese',2,3,2], ['Ecaz',2,3,2], ['Moritani',2,3,2]
  ];
  for (const [f, allowance, cap, cost] of cases) {
    const a = await resume(await gameWith([f, f === 'Guild' ? 'Atreides' : 'Guild'], { started: true }));
    await reach(a, 2, 4);
    const id = 'r2p4' + f;
    assert.match(a.app.innerHTML, new RegExp('<b>' + allowance + '</b><span class="small">Бесплатных войск'));
    assert.match(a.app.innerHTML, new RegExp('data-number="' + id + '-troops" data-delta="1" data-max="' + cap + '"'));
    for (let i=0; i<3; i++) a.click('delta', '1');
    assert.equal(output(a, 'data-revival-cost'), String(cost), f);
    assert.match(a.app.innerHTML, /все 5 ваших лидеров/);
    assert.doesNotMatch(a.app.innerHTML, /Лидеры, элитные войска и исключения проверены/);
    if (f === 'Fremen') assert.match(a.app.innerHTML, /не более одного Fedaykin/);
    if (f === 'Emperor') assert.match(a.app.innerHTML, /не более одного Sardaukar/);
    if (f === 'Ecaz') assert.match(a.app.innerHTML, /Duke Vidal/);
    if (f === 'CHOAM') assert.match(a.app.innerHTML, /Auditor/);
  }
});

test('Tleilaxu permission and ally choices change Revival caps, prices and recipients', async () => {
  const a = await resume(await gameWith(['Fremen','Tleilaxu','Emperor'], { started:true }));
  await reach(a, 2, 4);
  const id = 'r2p4Fremen';
  a.change({value:id + '-troops'}, '5');
  assert.equal(a.game().values[id + '-troops'],3);
  a.change({value:id + '-permission'}, 'yes');
  a.change({value:id + '-troops'}, '5');
  assert.equal(output(a,'data-revival-cost'),'4');
  assert.match(a.app.innerHTML,/Оплата: Тлейлаксу/);
  a.change({value:id + '-ally'}, 'Tleilaxu');
  assert.equal(output(a,'data-revival-cost'),'2');
  a.change({value:id + '-ally'}, 'Emperor');
  a.change({value:id + '-emperor'}, '3');
  assert.equal(output(a,'data-revival-cost'),'4');
  assert.equal(output(a,'data-emperor-revival-cost'),'6');
  a.change({value:id + '-permission'}, 'no');
  assert.equal(a.game().values[id + '-troops'],3);
  assert.equal(output(a,'data-revival-cost'),'0');
  const loaded = await resume(a.game());
  assert.equal(output(loaded,'data-emperor-revival-cost'),'6');
  loaded.action('next');
  assert.equal(output(loaded,'data-revival-cost'),'0');
  loaded.change({value:'r2p4Tleilaxu-troops'},'20');
  assert.equal(output(loaded,'data-revival-cost'),'18');
});

test('Ixian mixed forces and rounded allied leader costs do not use the ordinary force rate', async () => {
  const a = await resume(await gameWith(['Ixians','Tleilaxu','Emperor'], { started:true }));
  await reach(a,2,4);
  const id='r2p4Ixians';
  a.change({value:id+'-troops'},'3');
  a.change({value:id+'-cyborgs'},'2');
  assert.equal(output(a,'data-revival-cost'),'5');
  a.change({value:id+'-ally'},'Tleilaxu');
  assert.equal(output(a,'data-revival-cost'),'3');
  a.change({value:id+'-leader-type'},'normal');
  assert.equal(output(a,'data-leader-revival-cost'),'—');
  a.change({value:id+'-leader-price'},'5');
  assert.equal(output(a,'data-leader-revival-cost'),'3');
  a.input({value:id+'-leader-price'},'7');
  assert.equal(a.game().values[id+'-leader-price'],'7');
  a.action('pause');
  assert.equal(output(a,'data-leader-revival-cost'),'4');
  a.change({value:id+'-leader-type'},'early');
  a.change({value:id+'-leader-price'},'0');
  assert.equal(output(a,'data-leader-revival-cost'),'0');
  a.change({value:id+'-ally'},'Emperor');
  a.change({value:id+'-emperor'},'3');
  a.change({value:id+'-emperor-cyborgs'},'2');
  assert.equal(output(a,'data-emperor-revival-cost'),'8');
  a.change({value:id+'-troops'},'0');
  assert.equal(a.game().values[id+'-cyborgs'],0);
});

test('leader exceptions, unlimited CHOAM revival and disabled alliances survive save/load', async () => {
  for (const [f, type, amount] of [['Ecaz','vidal','5'],['Tleilaxu','zoal','2']]) {
    const a=await resume(await gameWith([f,'Guild'],{started:true}));
    await reach(a,2,4);
    a.change({value:'r2p4'+f+'-leader-type'},type);
    assert.equal(output(a,'data-leader-revival-cost'),amount);
    const loaded=await resume(a.game());
    assert.equal(output(loaded,'data-leader-revival-cost'),amount);
  }
  const a=await resume(await gameWith(['CHOAM','Fremen','Tleilaxu'],{started:true,alliances:false}));
  await reach(a,2,4);
  assert.doesNotMatch(a.app.innerHTML,/data-value="r2p4CHOAM-ally"/);
  a.change({value:'r2p4CHOAM-troops'},'20');
  a.change({value:'r2p4CHOAM-ally'},'Fremen');
  assert.equal(output(a,'data-revival-cost'),'20');
  assert.match(a.app.innerHTML,/Auditor/);
});

test('Bidding faction guidance follows participants, Advanced and alliances without adding steps or confirmations', async () => {
  for (const selected of [['Atreides','Guild'],['Ixians','Atreides'],['Richese','Guild'],['Ixians','Richese','Atreides']]) {
    for (const advanced of [false,true]) {
      for (const alliances of [false,true]) {
        const a = await resume(await gameWith(selected,{started:true,advanced,alliances}));
        await reach(a,1,3);
        const html = a.app.innerHTML;
        const ix = selected.includes('Ixians'), richese = selected.includes('Richese');
        assert.equal(html.includes('Иксиане · подготовка обычных торгов'),ix);
        assert.equal(html.includes('Иксиане · Technology'),ix && advanced);
        assert.equal(html.includes('Иксиане · бонус союзнику'),ix && alliances);
        assert.equal(html.includes('Richese · особая продажа'),richese);
        assert.equal(html.includes('Black Market'),richese && advanced);
        assert.equal(html.includes('Из отдельного запаса так передавать карты нельзя'),richese && alliances);
        assert.doesNotMatch(html,/Особые правила аукциона\.|Специальная продажа и вид аукциона\./);
        assert.equal([...html.matchAll(/data-check=/g)].length,richese ? 3 : 2);
        if (ix) {
          assert.ok(html.indexOf('Иксиане · подготовка обычных торгов') < html.indexOf('data-check="r1p3-cards"'));
          assert.match(html,/на верх или под низ общей колоды/);
          assert.match(html,/Эта карта не достаётся Иксианам в руку/);
          if (richese) assert.match(html,/сначала полностью проведите эту продажу, затем примените способность Иксиан/);
          if (advanced && selected.includes('Atreides')) assert.match(html,/до того как Атрейдесы её посмотрят/);
        }
        a.tick(2000);
        a.action('next');
        assert.equal(a.game().phase,5);
        assert.equal(a.game().elapsed['1|3|shared|main'],2000);
      }
    }
  }
});

test('Movement explains faction ranges and conditional modifiers without changing Shipment or navigation', async () => {
  const cases = [
    ['Fremen',true,true,'2'], ['Fremen',false,false,'2'],
    ['Ixians',true,true,'1 / 2'], ['Richese',true,true,'1'],
    ['Bene Gesserit',true,true,'1'], ['Bene Gesserit',false,false,'1'],
    ['CHOAM',true,false,'1'], ['Atreides',true,false,'1'], ['Moritani',true,true,'1']
  ];
  for (const [f,advanced,discovery,range] of cases) {
    const a = await resume(await gameWith([f,'Guild'],{
      started:true, advanced, modules:{discovery,stronghold:true,tech:true}
    }));
    await reach(a,1,5);
    assert.match(a.app.innerHTML,/data-shipment-cost/);
    a.action('next');
    const html = a.app.innerHTML;
    assert.equal(a.game().active,'1|5|'+f+'|move');
    assert.ok(html.includes('<b>'+range+'</b><span class="small">Территорий пешком'));
    assert.match(html,/после Shipment/);
    assert.match(html,/Только что высаженные туда войска тоже дают доступ/);
    assert.match(html,/Исходная территория не входит в расстояние/);
    assert.match(html,/Hajr даёт дополнительное перемещение/);
    assert.equal(html.includes('Discovery · жетон Ornithopter'),discovery);
    assert.equal(html.includes('Советницы не могут использовать орнитоптеры'),f === 'Bene Gesserit' && advanced);
    if (f === 'Fremen') {
      assert.match(html,/до 2 территорий.*до 3, а не 2 \+ 3/);
      assert.equal(html.includes('Исключение Фременов для высадки под бурю'),advanced);
    }
    if (f === 'Ixians') assert.match(html,/Suboid без Cyborg — до 1/);
    if (f === 'Richese') assert.match(html,/не дальность движения/);
    if (f === 'CHOAM') assert.match(html,/сбросить Kulon/);
    if (f === 'Moritani') assert.match(html,/Terror Tokens/);
    assert.doesNotMatch(html,/data-shipment-cost|data-check=/);
    a.tick(2000);
    a.action('back');
    assert.match(a.app.innerHTML,/data-shipment-cost/);
    a.action('next');
    assert.equal(a.clocks.step.textContent,'00:00:02');
  }
});

test('Battle gives concrete guidance for all twelve factions and distinguishes Basic from Advanced', async () => {
  const markers = {
    Fremen:['Fedaykin','Спайс для полной силы не нужен'],
    Atreides:['Предвидение:','Kwisatz Haderach'],
    Harkonnen:['4 Traitor Cards','После каждой своей победы'],
    Emperor:['Sardaukar','Поддержка одного жетона стоит 1 спайс'],
    Guild:['нет отдельного постоянного бонуса','нет отдельного постоянного бонуса'],
    'Bene Gesserit':['Voice:','Сражаются только бойцы'],
    Ixians:['Suboid — ½','Suboid всегда даёт ½'],
    Tleilaxu:['Face Dancers','Gholas'],
    CHOAM:['В Basic постоянного бонуса','Auditor'],
    Richese:['No-Field','реально выставленные войска'],
    Ecaz:['Duke Vidal','Loyalty'],
    Moritani:['Terror Tokens','Assassinate Leaders']
  };
  for (const [f,marker] of Object.entries(markers)) {
    for (const advanced of [false,true]) {
      const a=await resume(await gameWith([f,f === 'Guild' ? 'Atreides' : 'Guild'],{started:true,advanced}));
      await reach(a,1,6);
      const html=a.app.innerHTML;
      assert.ok(html.includes(marker[advanced ? 1 : 0]),f+' '+advanced);
      assert.match(html,/Скрытые карты вводить не требуется/);
      assert.doesNotMatch(html,/data-check=|Fedaykin и исключения Advanced|Предвидение боевого плана\.|Face Dancers и особые эффекты/);
      if (!advanced) assert.doesNotMatch(html,/активируется после суммарной гибели|Assassinate Leaders|Loyalty:|Сражаются только бойцы|Auditor:/);
      if (f === 'Ecaz' && advanced) assert.match(html,/округляя вниз по FAQ/);
      if (f === 'Harkonnen') assert.doesNotMatch(html,/не глядя возьмите до 4 карт/);
    }
  }
});

test('Battle updates opposing-faction exceptions and outside effects without restarting its timer', async () => {
  const a=await resume(await gameWith(['Fremen','Atreides','Emperor','Tleilaxu','CHOAM'],{started:true}));
  await reach(a,1,6);
  assert.match(a.app.innerHTML,/даже вне выбранной пары/);
  assert.match(a.app.innerHTML,/CHOAM участвует в партии/);
  a.tick(2000);
  a.change({value:'r1p6-a'},'Emperor');
  a.change({value:'r1p6-b'},'Fremen');
  assert.match(a.app.innerHTML,/Против Фременов Sardaukar имеют полную силу 1/);
  assert.doesNotMatch(a.app.innerHTML,/Sardaukar имеют полную силу 2/);
  a.change({value:'r1p6-b'},'Atreides');
  assert.match(a.app.innerHTML,/Sardaukar имеют полную силу 2/);
  assert.doesNotMatch(a.app.innerHTML,/Против Фременов Sardaukar имеют полную силу 1/);
  a.tick(3000);
  assert.equal(a.clocks.step.textContent,'00:00:05');
  a.change({value:'r1p6-a'},'Atreides');
  // The stored second choice now equals the first; the actual second faction falls back to Fremen.
  assert.match(a.app.innerHTML,/Спайс для полной силы не нужен/);
  assert.match(a.app.innerHTML,/Kwisatz Haderach/);
  a.action('home');
  const loaded=await resume(a.game());
  assert.equal(loaded.clocks.step.textContent,'00:00:05');
  assert.match(loaded.app.innerHTML,/Спайс для полной силы не нужен/);
  loaded.action('next');
  assert.equal(loaded.game().phase,7);
});

test('Battle No-Field and alliance guidance is contextual and CHOAM income is Advanced only', async () => {
  for (const advanced of [false,true]) {
    for (const alliances of [false,true]) {
      const a=await resume(await gameWith(['Atreides','Richese','Tleilaxu','CHOAM'],{started:true,advanced,alliances}));
      await reach(a,1,6);
      assert.match(a.app.innerHTML,/нельзя требовать раскрыть число на диске/);
      assert.match(a.app.innerHTML,/раскройте его одновременно с боевым планом/);
      assert.equal(a.app.innerHTML.includes('Союзнику можно дать предвидение'),alliances);
      assert.equal(a.app.innerHTML.includes('CHOAM участвует в партии'),advanced);
      a.change({value:'r1p6-b'},'Tleilaxu');
      assert.doesNotMatch(a.app.innerHTML,/даже вне выбранной пары|нельзя требовать раскрыть число на диске/);
      assert.match(a.app.innerHTML,/Zoal копирует силу лидера/);
    }
  }
});
