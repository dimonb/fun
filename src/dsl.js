// dsl.js — крошечный DSL комплексной арифметики, компилируемый в GLSL.
// Формула фрактала записана как строка с выражениями из билдеров (add, mul, …).
// compile() исполняет эту строку через eval в scope с билдерами и получает
// GLSL-тело фрагментного шейдера. eval здесь — это код-как-данные:
// формула фрактала есть данные, eval превращает её в шейдер.

// Узел — это просто строка GLSL-выражения (vec2). Билдеры композиции.

/** z — текущая точка итерации (vec2). */
export const z = () => 'z';

/** c — константа итерации: для Мандельброта это pos, для Жюлиа — jc. */
export const c = () => 'c';

/** Комплексная константа из числа или строки. */
export const num = (x, y = 0) =>
  `vec2(${Number(x)}, ${Number(y)})`;

/** Комплексное сложение. */
export const add = (a, b) => `cAdd(${a}, ${b})`;

/** Комплексное вычитание. */
export const sub = (a, b) => `cAdd(${a}, cNeg(${b}))`;

/** Комплексное умножение. */
export const mul = (a, b) => `cMul(${a}, ${b})`;

/** Модуль в квадрате (скаляр). */
export const abs2 = (a) => `dot(${a}, ${a})`;

/** Цикл итераций: fz — выражение для новой z, max — предельное число итераций,
 *  bound — порог escape (|z|^2 > bound). Возвращает GLSL-блок, считающий
 *  float i (число итераций до escape). */
export const iter = (fz, max, bound) => {
  const b = String(bound);
  return [
    `float i = 0.0;`,
    `const float MAX = ${Number(max)}.0;`,
    `for (float n = 0.0; n < MAX; n++) {`,
    `  z = ${fz};`,
    `  if (dot(z, z) > ${b}.0) break;`,
    `  i++;`,
    `}`,
  ].join('\n');
};

/** Завершение шейдера: красит пиксель по числу итераций i.
 *  Внутри использует z для сглаживания (smooth coloring). */
export const color = () => [
  `if (i >= MAX) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }`,
  `float sm = i - log2(log2(dot(z, z))) + 4.0;`,
  `vec3 col = palette(sm * 0.02);`,
  `col *= 0.9 + 0.1 * sin(sm * 0.5);`,
  `gl_FragColor = vec4(pow(col, vec3(0.9)), 1.0);`,
].join('\n');

// Прекомпиляция GLSL preamble: хелперы комплексной арифметики.
// Эмиттятся один раз на сборку.
const PREAMBLE = [
  'vec2 cAdd(vec2 a, vec2 b) { return a + b; }',
  'vec2 cNeg(vec2 a) { return -a; }',
  'vec2 cMul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }',
  'vec3 palette(float t) {',
  '  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.10, 0.20)) + time * 0.3);',
  '}',
].join('\n');

/**
 * Компилирует DSL-строку в полный фрагментный шейдер GLSL.
 *
 * Строка исполняется через eval в scope, где видны все билдеры (z, c, add,
 * mul, iter, color, …). Выражение должно вернуть массив строк GLSL-блоков,
 * которые склеиваются в тело main(). Сюда обычно входят вызов iter(...) и
 * color().
 *
 * @param {string} dslSource — код DSL, возвращающий массив GLSL-блоков.
 * @returns {string} полный исходник фрагментного шейдера.
 */
export function compile(dslSource) {
  // eval-крючок: формула фрактала — данные, здесь она становится кодом.
  // Билдеры доступны как свободные имена через destructuring scope.
  const factory = new Function(
    'z', 'c', 'num', 'add', 'sub', 'mul', 'abs2', 'iter', 'color',
    `"use strict";\nreturn ( ${dslSource} );`,
  );
  const blocks = factory(z, c, num, add, sub, mul, abs2, iter, color);
  if (!Array.isArray(blocks)) {
    throw new TypeError('DSL должен возвращать массив GLSL-блоков');
  }
  const body = blocks.map((b) => String(b)).join('\n');
  return [
    'precision highp float;',
    'uniform vec2 res;',
    'uniform vec2 center;',
    'uniform float scale;',
    'uniform float time;',
    'uniform int julia;',
    'uniform vec2 jc;',
    PREAMBLE,
    'void main() {',
    '  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;',
    '  vec2 pos = center + uv * scale;',
    '  vec2 z = julia == 1 ? pos : vec2(0.0);',
    '  vec2 c = julia == 1 ? jc : pos;',
    body
      .split('\n')
      .map((l) => (l.length ? `  ${l}` : l))
      .join('\n'),
    '}',
  ].join('\n');
}
