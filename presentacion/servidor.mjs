#!/usr/bin/env node
// Servidor de la charla: sirve la presentación (presentacion/) y, por el mismo origen, la demo de la escuela:
// /stage/* y /api/* se reenvían al servidor de la escuela (servidor/escuela.mjs), que este proceso levanta si no está.
// Un solo origen para las dos cosas: la vista de la escuela va en un iframe y las teclas de la charla siguen andando adentro.
// Si la escuela no responde, /stage/* se sirve desde el repo y la vista cae sola a la corrida grabada (plan B).
//
//   node presentacion/servidor.mjs                 # http://localhost:8090/ (abre el navegador)
//   node presentacion/servidor.mjs --puerto 9090 --sin-navegador --sin-escuela
//
// Variables: CHARLA_PUERTO (8090), ESCUELA_PUERTO (8080, el de la escuela). Las de la escuela (.env) las lee ella.

import { createServer, request as pedir, get as traer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const STAGE = join(RAIZ, 'stage');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.md': 'text/markdown; charset=utf-8', '.mp3': 'audio/mpeg' };

// Ruta pedida → archivo dentro de `base`, o null si se sale de la carpeta o no existe.
function archivoEn(base, ruta) {
  let rel; try { rel = decodeURIComponent(ruta); } catch { return null; }
  rel = normalize(rel).replace(/^([/\\]|\.\.[/\\]?)+/, '');
  if (rel.split(/[/\\]/).includes('..')) return null;
  let f = join(base, rel || 'index.html');
  if (!f.startsWith(base + sep) && f !== base) return null;
  try { let st = statSync(f); if (st.isDirectory()) { f = join(f, 'index.html'); st = statSync(f); } return st.isFile() ? f : null; } catch { return null; }
}
function servirArchivo(res, f, req = null) {
  const tipo = MIME[extname(f).toLowerCase()];
  if (!tipo) { res.writeHead(404); return res.end('No está.'); }
  const datos = readFileSync(f);
  // Rangos (bytes=a-b): sin esto el navegador trata el mp3 como una transmisión sin duración y la música en loop no vuelve a empezar.
  const r = req && /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (r && (r[1] || r[2])) {
    let desde = r[1] ? Number(r[1]) : Math.max(0, datos.length - Number(r[2])), hasta = r[1] && r[2] ? Number(r[2]) : datos.length - 1;
    hasta = Math.min(hasta, datos.length - 1);
    if (desde > hasta) { res.writeHead(416, { 'Content-Range': `bytes */${datos.length}` }); return res.end(); }
    res.writeHead(206, { 'Content-Type': tipo, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${desde}-${hasta}/${datos.length}`, 'Content-Length': hasta - desde + 1 });
    return res.end(datos.subarray(desde, hasta + 1));
  }
  res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' });
  res.end(datos);
}

// Crea el servidor. `escuela` = { host, port } del servidor de la escuela.
export function crearServidorCharla({ escuela = { host: '127.0.0.1', port: 8080 }, log = () => {} } = {}) {
  const server = createServer((req, res) => {
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]') { res.writeHead(403); return res.end('Solo local.'); }
    const url = new URL(req.url, 'http://localhost');
    const ruta = url.pathname;
    try {
      if (ruta.startsWith('/stage/') || ruta.startsWith('/api/') || ruta === '/stage') return reenviar(req, res, ruta);
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      const f = archivoEn(AQUI, ruta === '/' ? 'index.html' : ruta);
      if (!f || /\.(test\.mjs|mjs)$/.test(f) && f !== join(AQUI, 'reproductor.js')) { res.writeHead(404); return res.end('No está.'); }
      return servirArchivo(res, f, req);
    } catch (e) { log('error', e.message); if (!res.headersSent) res.writeHead(500); res.end('Error.'); }
  });

  // Proxy a la escuela. Reenvía método, cabeceras y cuerpo; la respuesta se va encadenando (sirve para el SSE de /api/eventos).
  function reenviar(req, res, ruta) {
    const p = pedir({ host: escuela.host, port: escuela.port, method: req.method, path: req.url, headers: { ...req.headers, host: `localhost:${escuela.port}` } }, (pr) => {
      res.writeHead(pr.statusCode, pr.headers);
      pr.pipe(res);
    });
    p.on('error', (e) => {
      if (res.headersSent) return res.end();
      // Sin escuela: la vista se sirve desde el repo (plan B: reproduce la grabación); la API dice que no hay servidor.
      if (req.method === 'GET' && ruta.startsWith('/stage')) {
        const f = archivoEn(STAGE, ruta.slice('/stage'.length));
        if (f) return servirArchivo(res, f);
        res.writeHead(404); return res.end('No está.');
      }
      log('escuela', `sin respuesta en ${escuela.host}:${escuela.port} (${e.code || e.message})`);
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'No hay servidor de la escuela.' }));
    });
    req.pipe(p);
    res.on('close', () => p.destroy());
  }

  return {
    server,
    escuchar: (puerto) => new Promise((ok, no) => { server.on('error', no); server.listen(puerto, '127.0.0.1', () => ok(server.address().port)); }),
    cerrar: () => new Promise((ok) => { server.close(() => ok()); if (server.closeAllConnections) server.closeAllConnections(); }),   // también las conexiones abiertas (SSE, keep-alive): si no, close() espera para siempre
  };
}

// ¿Responde la escuela? (GET a un archivo chico de la vista.)
export const escuelaResponde = (escuela, ms = 1500) => new Promise((ok) => {
  const r = traer({ host: escuela.host, port: escuela.port, path: '/stage/agentes.json', headers: { host: `localhost:${escuela.port}` }, timeout: ms }, (pr) => { pr.resume(); ok(pr.statusCode === 200); });
  r.on('error', () => ok(false)); r.on('timeout', () => { r.destroy(); ok(false); });
});

// ---------- Arranque desde la línea de comandos ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (n) => args.includes(n);
  const valor = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
  const PUERTO = Number(valor('--puerto', process.env.CHARLA_PUERTO || 8090));
  const escuela = { host: '127.0.0.1', port: Number(valor('--puerto-escuela', process.env.ESCUELA_PUERTO || 8080)) };
  const log = (...a) => console.log(new Date().toLocaleTimeString('es-AR', { hour12: false }), '[charla]', ...a);

  let hija = null, hijaCerro = false;
  if (!flag('--sin-escuela')) {
    if (await escuelaResponde(escuela)) log(`la escuela ya está en http://localhost:${escuela.port}/stage/`);
    else {
      log('levanto la escuela (servidor/escuela.mjs)…');
      hija = spawn(process.execPath, [join(RAIZ, 'servidor', 'escuela.mjs'), '--sin-navegador', '--puerto', String(escuela.port)], { cwd: RAIZ, stdio: 'inherit' });
      hija.on('exit', (code) => { hijaCerro = true; hija = null; if (code) log(`la escuela terminó con código ${code}: la demo va a reproducir la grabación (plan B).`); });
      // Espera a que responda (hasta 20 s) para que la vista arranque en vivo y no caiga a la grabación.
      for (let i = 0; i < 40 && !hijaCerro; i++) { if (await escuelaResponde(escuela, 500)) break; await new Promise((r) => setTimeout(r, 500)); }
      if (!hijaCerro && await escuelaResponde(escuela)) log(`la escuela responde en http://localhost:${escuela.port}/stage/`);
    }
  }

  const { escuchar, cerrar } = crearServidorCharla({ escuela, log });
  const puerto = await escuchar(PUERTO);
  const url = `http://localhost:${puerto}/`;
  console.log(`Charla → ${url}   (láminas + demo embebida · ? muestra las teclas · Ctrl+C para cortar)`);
  if (!flag('--sin-navegador')) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    setTimeout(() => spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).on('error', () => {}).unref(), 400);
  }
  const salir = () => { if (hija) hija.kill('SIGTERM'); setTimeout(() => process.exit(0), 1000).unref(); cerrar().finally(() => process.exit(0)); };   // y si algo no cierra, en 1 s se va igual
  process.on('SIGINT', salir); process.on('SIGTERM', salir);
}
