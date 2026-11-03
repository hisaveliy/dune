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
    a.action('next');
  }
}

test('settings remain readable when enabled; preparation keeps completed checklist styling and filters absent factions', async () => {
  for (const selected of [['Atreides', 'Harkonnen'], ['Atreides', 'Ixians'], ['Atreides', 'Emperor']]) {
    const a = await resume(await gameWith(selected));
    a.action('settings');
    assert.doesNotMatch(a.app.innerHTML, /class="completed"/);
    a.action('setup');
    assert.equal(a.app.innerHTML.includes('исключение Иксиан'), selected.includes('Ixians'));
    assert.equal(a.app.innerHTML.includes('исключение Харконненов'), selected.includes('Harkonnen'));
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
    assert.match(a.app.innerHTML, /Bidding — аукцион/);
    assert.doesNotMatch(a.app.innerHTML, /Этап торгов завершён/);
  }
});

test('legacy Charity cursors migrate once while preserving historic player time and inputs', async () => {
  for (const [cursor, expectedCursor, phase] of [[33, 28, 2], [35, 29, 3], [55, 49, 9]]) {
    const legacy = await gameWith(['Fremen', 'Atreides', 'Harkonnen', 'Emperor'], {
      started: true, cursor, round: 2, phase,
      values: { 'r2p2Atreides-bracket': '1' },
      elapsed: { '2|2|Atreides|main': 7000, '1|0|shared|main': 3000 }
    });
    delete legacy.timelineVersion;
    const a = await resume(legacy);
    assert.equal(a.game().cursor, expectedCursor);
    assert.equal(a.game().timelineVersion, 2);
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
    if (a.game().phase === 3 && a.app.innerHTML.includes('Bidding — подготовка')) assert.match(a.app.innerHTML, /data-check="r1p3-hands"/);
    if (a.game().phase === 4) assert.match(a.app.innerHTML, /data-check="r1p4\w+-leader"/);
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
