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
