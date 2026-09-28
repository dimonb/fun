// fractal.js — конкретный фрактал, заданный DSL-строкой.
// Формула компилируется в GLSL один раз при импорте через compile().

import { compile } from './dsl.js';

// Мандельброт/Жюлиа: z = z^2 + c, 500 итераций, escape при |z|^2 > 256.
// DSL-строка — это данные. eval внутри compile() превращает их в шейдер.
const dsl = `[
  iter(add(mul(z(), z()), c()), 500, 256),
  color(),
]`;

export const fragmentShader = compile(dsl);
