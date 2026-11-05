// Tests de la presentación: el deck (índice y láminas) y el servidor (estáticos, proxy a la escuela, plan B sin escuela).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { crearServidorCharla, escuelaResponde } from './servidor.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const deck = JSON.parse(readFileSync(join(AQUI, 'deck.json'), 'utf8'));

test('el índice del deck lista 23 láminas y cada una tiene su archivo con una <section> del mismo id', () => {
  assert.equal(deck.order.length, 23);
  assert.equal(new Set(deck.order).size, deck.order.length, 'ids repetidos');
  for (const id of deck.order) {
    const f = join(AQUI, 'slides', `${id}.html`);
    assert.ok(existsSync(f), `falta slides/${id}.html`);
    const html = readFileSync(f, 'utf8');
    const secciones = html.match(/<section\b/g) || [];
    assert.equal(secciones.length, 1, `${id}: debe tener una sola <section>`);
    assert.match(html, new RegExp(`<section id="${id}"`), `${id}: el id de la <section> no coincide`);
    assert.ok(/<aside>[\s\S]+<\/aside>\s*<\/section>/.test(html), `${id}: las notas (<aside>) van al final`);
  }
  for (const f of readdirSync(join(AQUI, 'slides'))) assert.ok(deck.order.includes(f.replace(/\.html$/, '')), `${f} no está en el orden`);
  for (const s of Object.values(deck.sections)) assert.ok(deck.order.includes(s.start), `la sección empieza en ${s.start}, que no existe`);
});

test('la demo embebida va justo después de "Escuela Futura" y es la única con data-demo', () => {
  assert.equal(deck.order[deck.order.indexOf('escuela') + 1], 'vivo');
  assert.equal(deck.order[deck.order.indexOf('vivo') + 1], 'volvemos', 'al salir de la demo hay una lámina de transición');
  for (const id of deck.order) {
    const html = readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8');
    assert.equal(/data-demo=/.test(html), id === 'vivo', id);
  }
});

test('los pasos (data-paso) de cada lámina van del 1 al N sin saltos, y las láminas que se decidió no tocar no tienen', () => {
  for (const id of deck.order) {
    const html = readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8');
    const pasos = [...html.matchAll(/data-paso="(\d+)"/g)].map((m) => Number(m[1]));
    if (id === 'tesis') { assert.equal(pasos.length, 0, 'tesis no se toca'); continue; }
    const n = Math.max(0, ...pasos);
    for (let k = 1; k <= n; k++) assert.ok(pasos.includes(k), `${id}: falta el paso ${k} de ${n}`);
    assert.ok(!pasos.includes(0), `${id}: data-paso="0" no significa nada`);
  }
});

test('las láminas no dependen de la red: ni /_blob/ ni URLs externas; los logos y las fuentes están en assets/', () => {
  for (const id of deck.order) {
    const html = readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8');
    assert.ok(!/_blob\//.test(html), `${id}: queda una imagen /_blob/`);
    assert.ok(!/https?:\/\//.test(html), `${id}: queda una URL externa`);
    for (const [, src] of html.matchAll(/<img[^>]*src="([^"]+)"/g)) assert.ok(existsSync(join(AQUI, src)), `${id}: falta ${src}`);
  }
  for (const f of ['assets/outfit.woff2', 'assets/jetbrains-mono.woff2', 'assets/innova-educa-21.png', 'assets/siglo-21.png', 'assets/alfredo.jpg', 'assets/greyla.jpg']) assert.ok(existsSync(join(AQUI, f)), f);
  const css = readFileSync(join(AQUI, 'estilo.css'), 'utf8');
  assert.ok(!/https?:\/\//.test(css), 'estilo.css no debe cargar nada por red');
});

// Una escuela falsa: contesta /api/ping y un SSE en /api/eventos.
function escuelaFalsa() {
  const s = createServer((req, res) => {
    if (req.url === '/api/ping') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ host: req.headers.host, metodo: req.method })); }
    if (req.url === '/api/eventos') { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('event: estado\ndata: {}\n\n'); return; }
    if (req.url === '/stage/agentes.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"falsa":true}'); }
    if (req.method === 'POST') { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { res.writeHead(201); res.end('recibido:' + b); }); return; }
    res.writeHead(404); res.end();
  });
  return new Promise((ok) => s.listen(0, '127.0.0.1', () => ok({ server: s, port: s.address().port, cerrar: () => new Promise((r) => s.close(r)) })));
}

test('sirve la presentación, reenvía /api y /stage a la escuela y nunca sale de su carpeta', async () => {
  const falsa = await escuelaFalsa();
  const charla = crearServidorCharla({ escuela: { host: '127.0.0.1', port: falsa.port } });
  const puerto = await charla.escuchar(0);
  const base = `http://localhost:${puerto}`;
  try {
    assert.ok(await escuelaResponde({ host: '127.0.0.1', port: falsa.port }));
    const inicio = await fetch(base + '/'); assert.equal(inicio.status, 200); assert.match(await inicio.text(), /<title>Institución Agéntica/);
    const lamina = await fetch(base + '/slides/cover.html'); assert.equal(lamina.status, 200); assert.match(lamina.headers.get('content-type'), /text\/html/);
    const fuente = await fetch(base + '/assets/outfit.woff2'); assert.equal(fuente.status, 200); assert.equal(fuente.headers.get('content-type'), 'font/woff2');
    for (const r of ['/../package.json', '/..%2fpackage.json', '/servidor.mjs', '/servidor.test.mjs', '/nada.html']) assert.equal((await fetch(base + r)).status, 404, r);
    const ping = await fetch(base + '/api/ping'); assert.equal(ping.status, 200);
    const d = await ping.json(); assert.equal(d.host, `localhost:${falsa.port}`); assert.equal(d.metodo, 'GET');
    const post = await fetch(base + '/api/mensaje', { method: 'POST', body: 'hola' }); assert.equal(post.status, 201); assert.equal(await post.text(), 'recibido:hola');
    const stage = await fetch(base + '/stage/agentes.json'); assert.deepEqual(await stage.json(), { falsa: true });
    // El SSE llega encadenado: el primer evento aparece sin esperar a que cierre la respuesta.
    const ac = new AbortController();
    const sse = await fetch(base + '/api/eventos', { signal: ac.signal });
    assert.match(sse.headers.get('content-type'), /event-stream/);
    const lector = sse.body.getReader(); const { value } = await lector.read();
    assert.match(new TextDecoder().decode(value), /event: estado/);
    ac.abort();
  } finally { await charla.cerrar(); await falsa.cerrar(); }
});

test('sin escuela, /stage/* se sirve desde el repo (plan B) y /api/* contesta 502', async () => {
  const falsa = await escuelaFalsa(); const puertoLibre = falsa.port; await falsa.cerrar();   // un puerto que seguro no escucha
  const charla = crearServidorCharla({ escuela: { host: '127.0.0.1', port: puertoLibre } });
  const puerto = await charla.escuchar(0);
  const base = `http://localhost:${puerto}`;
  try {
    assert.equal(await escuelaResponde({ host: '127.0.0.1', port: puertoLibre }, 300), false);
    const vista = await fetch(base + '/stage/'); assert.equal(vista.status, 200); assert.match(await vista.text(), /Escuela Futura/);
    const agentes = await fetch(base + '/stage/agentes.json'); assert.equal(agentes.status, 200); assert.ok(Array.isArray((await agentes.json()).agentes));
    assert.equal((await fetch(base + '/stage/../package.json')).status, 404);
    const api = await fetch(base + '/api/eventos'); assert.equal(api.status, 502);
  } finally { await charla.cerrar(); }
});

test('el servidor sirve por rangos (la música en loop lo necesita) y las láminas con música apuntan a presentacion/musica/', async () => {
  const { escuchar, cerrar } = crearServidorCharla({ escuela: { host: '127.0.0.1', port: 1 } });
  const puerto = await escuchar(0);
  try {
    const entero = readFileSync(join(AQUI, 'deck.json'));
    const r = await fetch(`http://localhost:${puerto}/deck.json`, { headers: { range: 'bytes=2-11' } });
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('content-range'), `bytes 2-11/${entero.length}`);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), entero.subarray(2, 12));
    const todo = await fetch(`http://localhost:${puerto}/deck.json`);
    assert.equal(todo.status, 200); assert.equal(todo.headers.get('accept-ranges'), 'bytes');
  } finally { await cerrar(); }
  const conMusica = deck.order.filter((id) => /data-musica=/.test(readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8')));
  assert.deepEqual(conMusica, ['cover', 'gracias'], 'suena en la portada (en loop) y en el cierre');
  for (const id of conMusica) assert.match(readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8'), /data-musica="musica\/[\w-]+\.mp3"/);
});
