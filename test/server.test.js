import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test('serves index.html at /', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /<canvas/);
});

test('serves static assets with correct MIME type', async () => {
  const js = await fetch(`${base}/main.js`);
  assert.equal(js.status, 200);
  assert.match(js.headers.get('content-type'), /text\/javascript/);

  const css = await fetch(`${base}/style.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
});

test('returns 404 for missing files', async () => {
  const res = await fetch(`${base}/nope.txt`);
  assert.equal(res.status, 404);
});

test('blocks path traversal', async () => {
  const res = await fetch(`${base}/..%2Fpackage.json`);
  assert.notEqual(res.status, 200);
});

test('rejects non-GET methods', async () => {
  const res = await fetch(`${base}/`, { method: 'POST' });
  assert.equal(res.status, 405);
});
