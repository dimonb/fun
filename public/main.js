const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl');

const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
// Шейдер инжектится сервером при старте: формула фрактала задаётся DSL-строкой
// в src/fractal.js, компилируется в GLSL через eval (src/dsl.js) и подставляется
// сюда на место маркера __SHADER__.
const fs = /*__SHADER__*/ '';

function shader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
gl.linkProgram(prog);
gl.useProgram(prog);

gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog, 'p');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

const U = n => gl.getUniformLocation(prog, n);
const u = { res: U('res'), center: U('center'), scale: U('scale'), time: U('time'), julia: U('julia'), jc: U('jc') };

// Seahorse valley — красивая точка для автозума
const target = [-0.743643887037151, 0.131825904205330];
let center = [-0.5, 0];
let scale = 2.5;
let auto = true;
let julia = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
addEventListener('resize', resize);
resize();

// взаимодействие
let drag = null;
canvas.addEventListener('mousedown', e => { drag = [e.clientX, e.clientY]; auto = false; canvas.style.cursor = 'grabbing'; });
addEventListener('mouseup', () => { drag = null; canvas.style.cursor = 'grab'; });
addEventListener('mousemove', e => {
  if (!drag) return;
  const k = scale / innerHeight;
  center[0] -= (e.clientX - drag[0]) * k;
  center[1] += (e.clientY - drag[1]) * k;
  drag = [e.clientX, e.clientY];
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  auto = false;
  const k = scale / innerHeight;
  const mx = center[0] + (e.clientX - innerWidth / 2) * k;
  const my = center[1] - (e.clientY - innerHeight / 2) * k;
  const f = Math.exp(e.deltaY * 0.0015);
  scale *= f;
  center[0] = mx + (center[0] - mx) * f;
  center[1] = my + (center[1] - my) * f;
}, { passive: false });
addEventListener('keydown', e => {
  if (e.code === 'Space') auto = !auto;
  if (e.code === 'KeyJ') { julia ^= 1; center = [julia ? 0 : -0.5, 0]; scale = 2.5; auto = !julia; }
});

const t0 = performance.now();
let last = t0;
function frame(now) {
  const dt = (now - last) / 1000; last = now;
  const t = (now - t0) / 1000;
  if (auto && !julia) {
    center[0] += (target[0] - center[0]) * Math.min(1, dt * 1.5);
    center[1] += (target[1] - center[1]) * Math.min(1, dt * 1.5);
    scale *= Math.exp(-dt * 0.35);
    if (scale < 2e-5) scale = 2.5; // float32 предел — начинаем заново
  }
  gl.uniform2f(u.res, canvas.width, canvas.height);
  gl.uniform2f(u.center, center[0], center[1]);
  gl.uniform1f(u.scale, scale);
  gl.uniform1f(u.time, t);
  gl.uniform1i(u.julia, julia);
  gl.uniform2f(u.jc, 0.7885 * Math.cos(t * 0.2), 0.7885 * Math.sin(t * 0.2));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
