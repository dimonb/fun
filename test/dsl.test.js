import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../src/dsl.js';
import { fragmentShader } from '../src/fractal.js';

test('compile() turns DSL into a GLSL fragment shader', () => {
  const src = compile(`[
    iter(add(mul(z(), z()), c()), 500, 256),
    color(),
  ]`);

  assert.match(src, /precision highp float;/);
  assert.match(src, /void main\(\)/);
  assert.match(src, /cMul/);
  assert.match(src, /cAdd/);
  assert.match(src, /const float MAX = 500\.0;/);
  assert.match(src, /for \(float n = 0\.0; n < MAX; n\+\+\)/);
  assert.match(src, /dot\(z, z\) > 256\.0/);
  assert.match(src, /gl_FragColor/);
});

test('compile() exposes complex helpers and palette in preamble', () => {
  const src = compile(`[iter(add(z(), c()), 10, 4), color()]`);
  assert.match(src, /vec2 cMul\(vec2 a, vec2 b\)/);
  assert.match(src, /vec2 cAdd\(vec2 a, vec2 b\)/);
  assert.match(src, /vec3 palette\(float t\)/);
});

test('compile() rejects DSL that does not return an array', () => {
  assert.throws(() => compile(`42`), /массив/);
});

test('fractal.js exports a ready Mandelbrot/Julia shader', () => {
  assert.match(fragmentShader, /cMul/);
  assert.match(fragmentShader, /julia == 1/);
  assert.match(fragmentShader, /const float MAX = 500\.0;/);
  assert.match(fragmentShader, /for \(float n = 0\.0; n < MAX/);
});
