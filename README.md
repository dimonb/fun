# fractal

Tiny zero-dependency Node.js server that renders an animated Mandelbrot / Julia fractal in the browser with WebGL.

## Run

```sh
npm install   # no dependencies, just creates package-lock.json
npm start     # http://localhost:3434
```

Other scripts:

- `npm run dev` — restarts the server on changes in `src/` or `public/`
- `npm test` — runs tests with the built-in `node:test`

Port can be changed via `PORT=8080 npm start`.

## Controls

- mouse wheel — zoom to cursor
- drag — pan
- `Space` — pause / resume auto-zoom
- `J` — toggle Julia / Mandelbrot

## Layout

```
public/   static frontend (index.html, style.css, main.js)
src/      HTTP server
test/     tests
```
