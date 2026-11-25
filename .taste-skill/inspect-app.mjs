import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import ts from '../client/node_modules/typescript/lib/typescript.js';

const phase = process.argv[2];
assert(['before', 'after'].includes(phase));
const out = resolve('.taste-skill', phase);
await mkdir(out, { recursive: true });
const sourcePaths = ['client/src/App.tsx', ...(await readdir('client/src/components'))
  .filter(name => name.endsWith('.tsx')).map(name => `client/src/components/${name}`)];
const sourceCopy = [];
for (const file of sourcePaths) {
  const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  sourceCopy.push(`## ${file.split('/').at(-1)}`, '');
  function visit(node) {
    if (ts.isJsxText(node)) {
      const copy = node.getText(source).replace(/\s+/g, ' ').trim();
      if (copy) sourceCopy.push(copy);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  sourceCopy.push('');
}
await writeFile(join(out, 'source-copy.md'), sourceCopy.join('\n'));
const lint = spawnSync(process.execPath, ['.agents/skills/design-taste-frontend/scripts/copy-lint.mjs',
  join(out, 'source-copy.md'), 'client/index.html', '--kind', 'software', '--json'], { encoding: 'utf8' });
await writeFile(join(out, 'copy-lint.json'), lint.stdout || lint.stderr);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const api = [];
let configured = false;
const server = createServer(async (req, res) => {
  const name = new URL(req.url, 'http://127.0.0.1').pathname.slice(1) || 'index.html';
  if (name.startsWith('api/reader/')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : null;
    if (req.method === 'POST') api.push({ name, body });
    res.setHeader('Content-Type', 'application/json');
    if (name.endsWith('-key')) {
      if (req.method === 'POST') configured = body.key === 'synthetic-test-key';
      return res.end(JSON.stringify({ configured }));
    }
    return res.end(JSON.stringify({ text: 'Fixture interpretation for the selected cards.' }));
  }
  try {
    const data = await readFile(join('client/dist', name));
    res.writeHead(200, { 'Content-Type': types[extname(name)] ?? 'application/octet-stream' }).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const profile = await mkdtemp(join(tmpdir(), 'living-tarot-taste-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true });
const measurements = [];
const actions = [];
const errors = [];
let socket;
try {
  let port;
  for (let n = 0; n < 100 && !port; n++) {
    try { port = parseInt(await readFile(join(profile, 'DevToolsActivePort'), 'utf8')); } catch { await sleep(100); }
  }
  assert(port, 'Chrome started');
  const [page] = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(ready => socket.addEventListener('open', ready, { once: true }));
  let id = 0;
  const calls = new Map();
  socket.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data);
    if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.text);
    if (event.method === 'Page.javascriptDialogOpening') void cdp('Page.handleJavaScriptDialog', { accept: true });
    if (event.id && calls.has(event.id)) {
      calls.get(event.id)(event);
      calls.delete(event.id);
    }
  });
  const cdp = (method, params = {}) => new Promise(done => {
    calls.set(++id, done);
    socket.send(JSON.stringify({ id, method, params }));
  }).then(event => { if (event.error) throw Error(event.error.message); return event.result; });
  async function run(fn, ...args) {
    const result = await cdp('Runtime.evaluate', { expression: `(${fn})(...${JSON.stringify(args)})`, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  async function wait(fn, ...args) {
    for (let i = 0; i < 50; i++) {
      if (await run(fn, ...args)) return;
      await sleep(80);
    }
    throw Error(`Timed out ${args.join(', ')}: ${fn}`);
  }
  const text = (part) => wait(part => document.body.innerText.includes(part), part);
  async function click(selector, label = '', index = 0) {
    await run((selector, label, index) => {
      const root = document.querySelector('dialog[open]') ?? document;
      const el = [...root.querySelectorAll(selector)].filter(e => e.getClientRects().length
        && (!label || e.textContent.trim().startsWith(label)))[index];
      if (!el || el.disabled) throw Error(`Unavailable: ${selector} ${label}`);
      el.focus();
      el.click();
    }, selector, label, index);
    await sleep(35);
    actions.push(label || selector);
  }
  const button = (label, index) => click('button', label, index);
  const summary = label => click('summary', label);
  async function field(selector, value) {
    await run((selector, value) => {
      const el = document.querySelector(selector);
      if (!el) throw Error(`Field unavailable: ${selector}`);
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, value);
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    }, selector, value);
    await sleep(35);
    actions.push(selector);
  }
  const db = () => run(() => JSON.parse(localStorage.getItem('living-tarot-db-v1')));
  const viewport = (width, height) => cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  const open = async () => {
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
    await sleep(230);
  };
  async function capture(view) {
    for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 740]]) {
      await viewport(width, height);
      await run(() => scrollTo(0, 0));
      await sleep(65);
      const info = await run(() => {
        const visible = element => element.getClientRects().length > 0;
        const buttons = [...document.querySelectorAll('button, summary')].filter(visible);
        const heights = buttons.map(e => e.getBoundingClientRect().height);
        const heading = document.querySelector('dialog[open] h2, dialog[open] h3, main h2, main h1');
        const image = [...document.images].filter(visible);
        return { width: innerWidth, height: innerHeight, pageHeight: document.documentElement.scrollHeight,
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          heading: heading?.textContent.trim(), headingSize: heading && getComputedStyle(heading).fontSize,
          controls: heights.length, controlsUnder44: heights.filter(h => h < 43.99).length,
          minControl: heights.length ? Math.round(Math.min(...heights)) : null,
          images: image.length, brokenImages: image.filter(i => i.complete && !i.naturalWidth).length,
          links: [...document.querySelectorAll('a[href]')].filter(visible).length };
      });
      measurements.push({ view, requestedWidth: width, ...info });
      if (width === 1440 || width === 390) {
        const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(out, `${view}-${width}.png`), Buffer.from(data, 'base64'));
      }
    }
    await viewport(1440, 900);
  }
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await viewport(1440, 900);
  await open();
  await text('A tarot reader');
  await capture('landing');
  await button('Set up my reader');
  await capture('setup');
  await button('Cancel setup');
  await button('Start a reading');
  await text('The reading table');
  await capture('reading-table');
  await field('#reading-spread', 'Five-Card Spread');
  await summary('Spread positions');
  await summary('Reading options');
  await field('#reading-deck', 'marseille');
  await field('#reading-deck', 'rws');
  await click('label', 'Allow reversals');
  await button('Connect Gemini');
  await capture('gemini-dialog');
  await field('#gemini-api-key', 'synthetic-test-key');
  await button('Connect and use Gemini');
  await wait(() => !document.querySelector('dialog[open]'));
  assert.equal(api[0].body.key, 'synthetic-test-key');
  await click('label', 'Include card associations');
  await field('#reading-question', 'How can I make time for ceramics?');
  await button('Preview the cards');
  await button('Draw again');
  await button('Read the cards');
  await text('Fixture interpretation');
  assert.equal(api.at(-1).body.question, 'How can I make time for ceramics?');
  assert.equal(api.at(-1).body.mode, 'reading');
  await capture('reader');
  await summary('Cards in this spread');
  const original = (await db()).readings[0];
  await button('Set up my reader');
  await field('#setup-name', 'Rowan');
  await button('Continue');
  await summary('Add more context');
  await field('#setup-context', 'I want to make more time for ceramics.');
  await field('#setup-goals', 'Make something by hand');
  await button('Continue');
  await click('label', 'The Mystic');
  await button('Save and see guidance');
  await text('Personalized guidance');
  assert.equal((await db()).readings[0].interpretation, original.interpretation);
  assert.deepEqual((await db()).readings[0].cards, original.cards);
  await field('#chat-reader-voice', 'interpreter');
  await field('[aria-label="Talk to the reader"]', 'How do the cards fit together?');
  await button('Send');
  await wait(() => document.querySelectorAll('.chat-msg').length >= 2);
  assert.equal(api.at(-1).body.mode, 'follow-up');
  await summary('Add personal card meanings');
  await field('input[id^="remember-"]', 'A moment to pause');
  await button('Remember');
  await button('Complete this reading');
  await text('Reading saved');
  await button('Open');
  await field('[aria-label="What actually happened since this reading?"]', 'I made a bowl.');
  await button('Add reflection');
  await capture('archive');
  await run(() => {
    window.downloads = [];
    const create = URL.createObjectURL;
    URL.createObjectURL = blob => { window.downloads.push(blob); return create.call(URL, blob); };
    HTMLAnchorElement.prototype.click = () => {};
  });
  await button('Download JSON backup');
  await button('Download plain-text copy');
  assert.equal(await run(() => window.downloads.length), 2);
  await field('[aria-label="Search by question, spread, or card"]', 'no match');
  await button('Clear search');
  await button('Close');
  await button('Lexicon');
  await capture('lexicon');
  await field('[aria-label="Filter by arcana"]', 'major');
  await field('[aria-label="Filter by suit"]', 'all');
  await field('[aria-label="Search cards"]', 'the star');
  await click('.tarot-card');
  await capture('lexicon-dialog');
  await field('#lexicon-association', 'A clearer evening');
  await button('Add');
  await field('[aria-label="Signifier kind"]', 'period');
  await field('[aria-label="Who or what does this card stand for?"]', 'A quiet season');
  await button('Set signifier');
  await button('Remove');
  await button('Close');
  await button('Life Memory');
  await field('#life-memory-text', 'A ceramics class begins Monday.');
  await field('[aria-label="Memory kind"]', 'goal');
  await field('[aria-label="Memory timeframe"]', 'current');
  await button('Add');
  await capture('life-memory');
  await button('Edit');
  await button('Cancel');
  await button('Hide');
  await button('Restore');
  await button('Delete');
  await button('Patterns');
  await capture('patterns');
  await button('Symbol Journal');
  await field('[aria-label="Symbol journal entry"]', 'The water on the card stood out.');
  await field('[aria-label="Attach a card"]', 'the-star');
  await button('Add entry');
  await capture('symbol-journal');
  await button('Delete');
  await button('Profile');
  await capture('profile');
  await field('#profile-deck', 'midnight');
  await button('Save profile');
  assert.equal((await db()).preferredDeck, 'midnight');
  await button('Reading Table');
  await click('label', 'Use my physical deck');
  await click('.physical-card-choice');
  await capture('physical-picker');
  await field('#card-picker-search', 'the fool');
  await click('.card-picker-results button', 'The Fool');
  await click('.physical-orientation input');
  await click('.physical-card-choice', 'The Fool');
  await button('Clear card');
  await click('.physical-card-choice');
  await button('Close');
  await click('label', 'Use my physical deck');
  await field('#reading-question', 'Another reading');
  await button('Talk first');
  await text('Read the cards');
  await button('← Back to the table');
  await button('Resume');
  await button('Read the cards');
  await text('Fixture interpretation');
  await button('Complete this reading');
  await button('Delete');
  assert.equal((await db()).readings.length, 1);
  await open();
  await text('The reading table');
  const invalid = measurements.filter(row => row.brokenImages);
  assert.deepEqual(invalid, []);
  assert.deepEqual(errors, []);
  console.log(`${phase}: ${measurements.length} layout measurements, ${actions.length} interactions, ${api.length} fixture requests, no browser exceptions`);
  if (phase === 'after') {
    await run(() => localStorage.clear());
    await viewport(390, 844);
    await open();
    await click('.welcome-skip');
    await wait(() => document.activeElement.id === 'welcome-main');
    await button('Start a reading', 1);
    await field('#reading-spread', 'Single-Card Draw');
    await click('label', 'Use my physical deck');
    await click('.physical-card-choice');
    await field('#card-picker-search', 'the fool');
    await click('.card-picker-results button', 'The Fool');
    await click('.physical-orientation input');
    await button('Read the cards');
    await text('Guidance for your situation');
    const physical = (await db()).readings[0];
    assert.equal(physical.physicalDeck, true);
    assert.equal(physical.cards[0].cardId, 'the-fool');
    assert.equal(physical.cards[0].reversed, true);
    assert(physical.interpretation);
    assert.equal(api.length, 4);
    console.log('After-only checks passed: skip link, closing action, and local physical-deck reading on mobile.');
  }
} finally {
  await writeFile(join(out, 'measurements.json'), JSON.stringify(measurements, null, 2));
  await writeFile(join(out, 'interactions.json'), JSON.stringify({ actions, api, errors }, null, 2));
  socket?.close();
  chrome.kill();
  server.close();
}
