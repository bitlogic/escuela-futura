#!/usr/bin/env node
// E2E de la demo: corre el guion "Martina" de punta a punta contra el servidor real, saca capturas de la vista en cada
// momento clave, evalúa con chequeos deterministas (chequeos.mjs) y con un juez Claude (juez.mjs) y deja todo en
// evaluaciones/<fecha>-<modelo>/ (eventos, transcript, capturas, puntaje.json, informe.md).
//
//   node e2e/corrida.mjs                                   # una corrida con ESCUELA_MODEL
//   node e2e/corrida.mjs --modelos claude-opus-5-5,claude-sonnet-5-5   # una por modelo y una comparación
//   node e2e/corrida.mjs --corrida stage/corridas/x.eventos.json       # evalúa una grabación (sin agentes)
//   node e2e/corrida.mjs --modelos claude-sonnet-5-5 --rondas 10       # N corridas por modelo: tabla de variación y la meta
//   flags: --puerto 8090 · --effort low|medium|high · --nombre Greyla · --sin-juez · --sin-capturas · --guardar
//          --juez <modelo del juez> (ESCUELA_JUEZ_MODEL, claude-opus-5-5) · --salida evaluaciones
//          --rondas N (1) · --meta-propuesta <segundos> (45) y --meta-juez <puntaje> (85): la meta que la tanda tiene que cumplir entera

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname, resolve, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearSeguimiento } from '../stage/seguimiento.js';
import { esPropuesta, propuesta, redactarDecision } from '../stage/chat.js';
import { completarHerramienta } from '../stage/herramientas.js';
import { evaluarEventos, transcript, NOMBRES } from './chequeos.mjs';
import { juzgar } from './juez.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(RAIZ, '.env');
if (existsSync(envFile)) for (const l of readFileSync(envFile, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valor = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
const PUERTO = Number(valor('--puerto', 8090));
const MODELOS = (valor('--modelos', process.env.ESCUELA_MODEL || 'claude-sonnet-5-5')).split(',').map((s) => s.trim()).filter(Boolean);
const EFFORT = valor('--effort', process.env.ESCUELA_EFFORT || 'medium');
const NOMBRE = valor('--nombre', process.env.ESCUELA_DIRECTOR || 'Alfredo');
const JUEZ = valor('--juez', process.env.ESCUELA_JUEZ_MODEL || 'claude-opus-5-5');
const SALIDA = resolve(RAIZ, valor('--salida', 'evaluaciones'));
const GRABADA = valor('--corrida', null);
const CON_JUEZ = !flag('--sin-juez'), CON_CAPTURAS = !flag('--sin-capturas'), GUARDAR = flag('--guardar');
const RONDAS = Math.max(1, Number(valor('--rondas', 1)) || 1);
// La meta "irrazonable": todas las corridas de la tanda con la propuesta en menos de META.propuesta s, cero cifras sin comprobar y juez "lista" con META.juez o más
const META = { propuesta: Number(valor('--meta-propuesta', 45)) || 45, juez: Number(valor('--meta-juez', 85)) || 85 };

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
const sinTildes = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const agenteDe = (n) => { const k = sinTildes(n); return Object.keys(NOMBRES).find((id) => id === k || sinTildes(NOMBRES[id]) === k) || null; };
const nombreDe = (id) => NOMBRES[id] || id;
const hora = () => new Date().toLocaleTimeString('es-AR', { hour12: false });
const log = (...a) => console.log(hora(), ...a);
const fechaCorta = () => { const d = new Date(), dd = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}-${dd(d.getHours())}${dd(d.getMinutes())}`; };
// La sesión: cuál de los guiones de stage/atajos.json se corre (--sesion martina | aspirantes | oferta). Los actos salen de los títulos de los atajos.
const DATOS_ATAJOS = JSON.parse(readFileSync(join(RAIZ, 'stage', 'atajos.json'), 'utf8'));
const SESION = valor('--sesion', 'martina');
const SES = (DATOS_ATAJOS.sesiones || []).find((x) => x.id === SESION) || { id: 'martina', titulo: 'Martina', atajos: DATOS_ATAJOS.atajos };
if (!SES.atajos || !SES.atajos.length) { console.error(`No hay sesión "${SESION}" en stage/atajos.json`); process.exit(1); }
const porTitulo = (re) => (SES.atajos.find((a) => re.test(a.titulo)) || {}).texto;
const GUION = { objetivo: SES.atajos[0].texto, decisionAMano: porTitulo(/decisi/i), limite: porTitulo(/l[ií]mite/i), capo: porTitulo(/cap[oó]/i), proceso: porTitulo(/redise/i), color: porTitulo(/nota de color/i) };
const ES_MARTINA = SES.id === 'martina';

// ── Los momentos que se capturan, detectados sobre el seguimiento (sirve en vivo y sobre una grabación) ─────
const MOMENTOS = [
  { nombre: '01-pensando', cuando: (s) => s.pedidos[0] && Object.keys(s.pedidos[0].vivos).length > 0 },
  { nombre: '02-trabajando', cuando: (s) => s.pedidos[0] && Object.values(s.pedidos[0].vivos).some((v) => v.herramienta) && s.pedidos[0].repartido },
  { nombre: '03-propuesta', cuando: (s) => s.pedidos[0] && s.pedidos[0].estado === 'propuesta' },
  { nombre: '04-cierre', cuando: (s) => s.pedidos[0] && s.pedidos[0].estado === 'cerrado' },
  // El Tablero: se abre con la tecla b (en vivo) o con #tablero (grabación), se captura y se vuelve a la escuela
  { nombre: '05-tablero', cuando: (s) => s.pedidos[0] && s.pedidos[0].estado === 'cerrado', antes: (p) => p.keyboard.press('b'), despues: (p) => p.keyboard.press('Escape'), hash: '#tablero' },
  { nombre: '06-limite', cuando: (s) => s.pedidos[1] && s.pedidos[1].estado === 'cerrado' },
  { nombre: '07-capo', cuando: (s) => s.pedidos[2] && s.pedidos[2].estado === 'cerrado' },
  // Acto 7: rediseñar el proceso. La rutina se decide en el panel y queda en el Tablero junto a las acciones de Martina
  { nombre: '08-proceso', cuando: (s) => s.pedidos[3] && s.pedidos[3].estado === 'propuesta' },
  { nombre: '09-tablero-final', cuando: (s) => s.pedidos[3] && s.pedidos[3].estado === 'cerrado', antes: (p) => p.keyboard.press('b'), despues: (p) => p.keyboard.press('Escape'), hash: '#tablero' },   // el Tablero abre en Lista: la rutina es un grupo aparte, al lado del de Martina
];
// En las otras sesiones no hay acto 7: los dos últimos momentos no se esperan
if (!GUION.proceso) MOMENTOS.splice(MOMENTOS.findIndex((m) => m.nombre === '08-proceso'), 2);
if (GUION.color) MOMENTOS.push({ nombre: '08-color', cuando: (s) => s.pedidos[3] && s.pedidos[3].estado === 'cerrado' });
const nuevoSeguimiento = () => crearSeguimiento({ agenteDe, esPropuesta });
/** Qué acciones se reserva la persona: las que nombra la oración "… la hago yo" del atajo de decisión (en Martina, la llamada). */
function estadosDeDecision(acciones) {
  const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const oracionYo = norm(GUION.decisionAMano || '').split(/[.;]\s*/).find((o) => /hago yo|llamo yo|hablo yo/.test(o)) || '';
  const estados = {}; acciones.forEach((a, i) => { const claves = norm(a.texto).split(/\s+/).filter((w) => w.length >= 5).map((w) => w.slice(0, 5)); estados[i] = claves.some((w) => oracionYo.includes(w)) ? 'yo' : 'si'; });
  return estados;
}

async function abrirNavegador(url) {
  const { chromium } = await import('playwright');
  const navegador = await chromium.launch();
  const page = await navegador.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'load' }); await dormir(1500);
  return { navegador, page };
}

// ── En vivo ───────────────────────────────────────────────────────────────────
async function correrEnVivo({ modelo, dir }) {
  const base = `http://127.0.0.1:${PUERTO}`;
  const logServidor = []; const fallas = [];
  const servidor = spawn(process.execPath, [join(RAIZ, 'servidor', 'escuela.mjs'), '--puerto', String(PUERTO), '--sin-navegador'], { env: { ...process.env, ESCUELA_MODEL: modelo, ESCUELA_EFFORT: EFFORT, ESCUELA_DIRECTOR: NOMBRE }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const s of [servidor.stdout, servidor.stderr]) s.on('data', (d) => logServidor.push(String(d)));
  const post = (ruta, cuerpo) => fetch(base + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo || {}) });
  let listo = false;
  for (let i = 0; i < 60 && !listo; i++) { try { listo = (await fetch(base + '/api/estado')).ok; } catch {} if (!listo) await dormir(500); }
  if (!listo) { servidor.kill(); throw new Error('El servidor no arrancó:\n' + logServidor.join('')); }
  await post('/api/reiniciar');
  const estado = await (await fetch(base + '/api/estado')).json();
  log(`servidor listo · ${estado.modelo} · decide ${estado.persona}`);

  // Eventos por SSE, al seguimiento
  const seg = nuevoSeguimiento(); const eventos = [];
  const ac = new AbortController();
  (async () => {
    try {
      const r = await fetch(base + '/api/eventos', { signal: ac.signal });
      const lector = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await lector.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = (frame.match(/^event: (.*)$/m) || [])[1], data = (frame.match(/^data: (.*)$/m) || [])[1];
          if (ev !== 'eventos' || !data) continue;
          for (const e of JSON.parse(data)) { eventos.push(e); seg.aplicar(e.tipo === 'herramienta' ? completarHerramienta(e) : e); }
        }
      }
    } catch (e) { if (e.name !== 'AbortError') fallas.push('SSE: ' + e.message); }
  })();

  // Capturas en los momentos clave, mientras pasa
  const capturas = []; let nav = null;
  if (CON_CAPTURAS) { try { nav = await abrirNavegador(`${base}/stage/?nombre=${encodeURIComponent(NOMBRE)}&tema=oscuro&luz=0`);   // sin la luz cenital: las capturas del juez son comparables con las de antes } catch (e) { fallas.push('navegador: ' + e.message); } }
  let vigilando = true; const tomadas = new Set(), listas = new Set();
  const vigilante = (async () => {
    while (vigilando) {
      for (const m of MOMENTOS) if (!tomadas.has(m.nombre) && m.cuando(seg)) {
        tomadas.add(m.nombre); await dormir(1800);   // que la vista termine de dibujar (tarjeta, cartel, globos)
        if (nav) { try { if (m.antes) { await m.antes(nav.page); await dormir(1200); } const png = await nav.page.screenshot({ path: join(dir, m.nombre + '.png') }); capturas.push({ nombre: m.nombre + '.png', png }); log('captura', m.nombre); if (m.despues) { await m.despues(nav.page); await dormir(400); } } catch (e) { fallas.push(`captura ${m.nombre}: ${e.message}`); } }
        listas.add(m.nombre);
      }
      await dormir(300);
    }
  })();
  // Antes de mandar el mensaje siguiente, la captura del momento anterior tiene que estar tomada: si no, la pantalla ya muestra lo que viene.
  const esperarCaptura = async (nombre) => { const t0 = Date.now(); while (Date.now() - t0 < 8000 && !listas.has(nombre)) await dormir(150); };

  const esperar = async (que, cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond(seg)) return true; await dormir(300); } fallas.push(`no llegó: ${que} (${ms / 1000} s)`); log('✗ no llegó:', que); return false; };
  const mandar = async (t, extra) => { log('persona:', t.slice(0, 80)); const r = await post('/api/mensaje', { texto: t, ...extra }); if (!r.ok) fallas.push(`mensaje rechazado: ${(await r.json()).error}`); };

  // Acto 1 a 3: el objetivo, hasta la propuesta
  await mandar(GUION.objetivo);
  const hayPropuesta = await esperar('la propuesta', (s) => s.pedidos[0] && s.pedidos[0].estado === 'propuesta', 300_000);
  // Acto 4: la decisión, redactada desde la tarjeta (las acciones de la propuesta): todo sí, la llamada la hago yo
  if (hayPropuesta) {
    await esperarCaptura('03-propuesta');
    const p = propuesta(seg.pedidos[0].propuesta); const caso = p.casos[0];
    let decision = GUION.decisionAMano, estructurada;
    const conAcciones = p.casos.filter((c) => c.acciones.length);
    if (conAcciones.length) {   // uno o varios casos (aspirantes: tres): todas las acciones sí, salvo la que la persona se reserva
      const porCaso = {}; const acciones = [];
      for (const c of conAcciones) { const est = estadosDeDecision(c.acciones); porCaso[c.n] = { acciones: est }; c.acciones.forEach((a, i) => acciones.push({ texto: a.texto, quien: a.quien, estado: est[i] })); }
      decision = redactarDecision(p.casos, porCaso) || decision;
      estructurada = { decision: { acciones, nota: '', caso: conAcciones.map((c) => c.nombre).join(', '), objetivo: GUION.objetivo } };   // como la manda la tarjeta: el Tablero titula la tarea con el caso
    } else fallas.push('la propuesta no trajo acciones parseables: se decidió a mano');
    await mandar(decision, estructurada);
    await esperar('el cierre', (s) => s.pedidos[0].estado === 'cerrado', 150_000);
  }
  // Acto 5: el límite
  await esperarCaptura('05-tablero');
  if (GUION.limite) { await mandar(GUION.limite); await esperar('la respuesta al límite', (s) => s.pedidos.length >= 2 && s.pedidos[s.pedidos.length - 1].estado === 'cerrado', 150_000); }
  // Acto 6: el capó
  await esperarCaptura('06-limite');
  if (GUION.capo) { await mandar(GUION.capo); await esperar('la respuesta al capó', (s) => s.pedidos.length >= 3 && s.pedidos[s.pedidos.length - 1].estado === 'cerrado', 150_000); }
  await esperarCaptura('07-capo');
  // Nota de color (oferta): tres nombres
  if (GUION.color) { await mandar(GUION.color); await esperar('la nota de color', (s) => s.pedidos.length >= 4 && s.pedidos[s.pedidos.length - 1].estado === 'cerrado', 150_000); await esperarCaptura('08-color'); }
  // Acto 7: que no dependa de pedirlo. Coordinación propone una rutina; se aprueba entera desde el panel
  if (GUION.proceso) {
    await mandar(GUION.proceso);
    const hayRutina = await esperar('la propuesta de proceso', (s) => s.pedidos.length >= 4 && s.pedidos[s.pedidos.length - 1].estado === 'propuesta', 200_000);
    if (hayRutina) {
      await esperarCaptura('08-proceso');
      const ped = seg.pedidos[seg.pedidos.length - 1]; const p = propuesta(ped.propuesta); const caso = p.casos[0];
      let decision = 'Aprobado. Que quede en el Tablero con sus responsables.', estructurada;
      if (caso && caso.acciones.length) {
        const estados = {}; caso.acciones.forEach((a, i) => { estados[i] = 'si'; });
        decision = redactarDecision(p.casos, { [caso.n]: { acciones: estados } }) || decision;
        estructurada = { decision: { acciones: caso.acciones.map((a, i) => ({ texto: a.texto, quien: a.quien, estado: estados[i] })), nota: '', caso: caso.nombre, objetivo: GUION.proceso } };
      } else fallas.push('la propuesta de proceso no trajo acciones parseables: se aprobó a mano');
      await mandar(decision, estructurada);
      await esperar('el cierre del proceso', (s) => s.pedidos[s.pedidos.length - 1].estado === 'cerrado', 150_000);
    }
  }
  // Calma: que nadie siga trabajando
  await esperar('la calma', (s) => !s.pedidos.some((p) => Object.keys(p.vivos).length), 30_000);
  await esperarCaptura('09-tablero-final'); await dormir(1000);
  vigilando = false; await vigilante;

  const corrida = await (await fetch(base + '/api/corrida')).json();
  if (GUARDAR) { const r = await post('/api/corridas', { titulo: valor('--titulo', `${SES.titulo || 'E2E'} · ${modelo.includes('sonnet') ? 'Sonnet' : 'Opus'} ${fechaCorta()}`) }); const d = await r.json(); if (r.ok) log('guardada en stage/corridas:', d.archivo); else fallas.push('no se guardó: ' + d.error); }
  ac.abort(); if (nav) await nav.navegador.close();
  servidor.kill(); await dormir(300);
  writeFileSync(join(dir, 'servidor.log'), logServidor.join(''));
  const t0 = corrida.eventos.length ? corrida.eventos[0].t : 0;
  return { eventos: corrida.eventos.map((e) => ({ ...e, t: e.t - t0 })), capturas, fallas, persona: estado.persona };
}

// ── Sobre una grabación (sin agentes): capturas por paso, con un servidor estático ──────────────────────
async function evaluarGrabada({ archivo, dir }) {
  const ruta = resolve(RAIZ, archivo); const data = JSON.parse(readFileSync(ruta, 'utf8'));
  const eventos = (data.eventos || []).map((e, _, arr) => ({ ...e, t: e.t - (arr[0] ? arr[0].t : 0) }));
  const capturas = [], fallas = [];
  if (CON_CAPTURAS) {
    const STAGE = join(RAIZ, 'stage');
    const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml' };
    const estatico = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost'); const rel = normalize(decodeURIComponent(url.pathname.replace(/^\/stage\/?/, ''))).replace(/^(\.\.[/\\])+/, '');
      let f = rel === '_eval/eventos.json' ? ruta : join(STAGE, rel || 'index.html');
      if (rel !== '_eval/eventos.json' && !f.startsWith(STAGE)) { res.writeHead(404); return res.end(); }
      let st; try { st = statSync(f); if (st.isDirectory()) { f = join(f, 'index.html'); st = statSync(f); } } catch { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' }); createReadStream(f).pipe(res);
    });
    await new Promise((ok) => estatico.listen(PUERTO, '127.0.0.1', ok));
    // Qué paso corresponde a cada momento: se alimenta el seguimiento evento por evento
    const seg = nuevoSeguimiento(); const pasos = {};
    eventos.forEach((e, i) => { seg.aplicar(e.tipo === 'herramienta' ? completarHerramienta(e) : e); for (const m of MOMENTOS) if (!(m.nombre in pasos) && m.cuando(seg)) pasos[m.nombre] = i + 1; });
    try {
      const nav = await abrirNavegador(`http://127.0.0.1:${PUERTO}/stage/?grabacion=1&corrida=_eval/eventos.json&auto=0&tema=oscuro&nombre=${encodeURIComponent(NOMBRE)}`);
      for (const m of MOMENTOS) {
        if (!(m.nombre in pasos)) { fallas.push(`sin momento ${m.nombre} en la grabación`); continue; }
        await nav.page.goto(`http://127.0.0.1:${PUERTO}/stage/?grabacion=1&corrida=_eval/eventos.json&paso=${pasos[m.nombre]}&auto=0&tema=oscuro&nombre=${encodeURIComponent(NOMBRE)}${m.hash || ''}`, { waitUntil: 'load' }); await dormir(m.hash ? 2500 : 1500);
        const png = await nav.page.screenshot({ path: join(dir, m.nombre + '.png') }); capturas.push({ nombre: m.nombre + '.png', png }); log('captura', m.nombre, 'paso', pasos[m.nombre]);
      }
      await nav.navegador.close();
    } catch (e) { fallas.push('capturas: ' + e.message); }
    estatico.close();
  }
  return { eventos, capturas, fallas, persona: NOMBRE };
}

// ── Informe ───────────────────────────────────────────────────────────────────
function informe({ modelo, origen, chequeos, juez, fallas, transcript: tr }) {
  const L = [];
  L.push(`# Evaluación E2E · ${modelo}`, '', `Origen: ${origen}. Fecha: ${new Date().toLocaleString('es-AR')}.`, '');
  const total = juez ? Math.round((chequeos.puntaje + juez.total) / 2) : chequeos.puntaje;
  L.push(`## Puntaje: ${total} / 100`, '', `- Chequeos deterministas: **${chequeos.puntaje}**`, juez ? `- Juez (${JUEZ}): **${juez.total}** · veredicto: **${juez.veredicto}**` : '- Juez: no corrió', '');
  const m = chequeos.medidas;
  L.push('## Medidas', '', `| Hasta la propuesta | Hasta el cierre | Total | Llamadas a herramientas | Mensajes de agentes | Datos (verificador) | Sin comprobar |`, `|---|---|---|---|---|---|---|`, `| ${m.segundosHastaPropuesta ?? '—'} s | ${m.segundosHastaCierre ?? '—'} s | ${m.segundosTotales} s | ${m.llamadasHerramientas} | ${m.mensajesAgentes} | ${m.datos ?? '—'} | ${m.datosSinComprobar ?? '—'}${m.sinComprobar && m.sinComprobar.length ? ' (' + m.sinComprobar.join(' · ') + ')' : ''} |`, '');
  const meta = cumpleMeta({ medidas: m, juez });
  L.push(`Meta (propuesta ≤ ${META.propuesta} s · 0 sin comprobar · juez "lista" ≥ ${META.juez}): **${meta.ok ? 'cumplida' : 'no'}**${meta.falta.length ? ' · falta: ' + meta.falta.join(', ') : ''}`, '');
  L.push('## Chequeos', '', '| | Chequeo | Peso | Detalle |', '|---|---|---|---|');
  for (const c of chequeos.chequeos) L.push(`| ${c.ok ? '✓' : '✗'} | ${c.titulo} | ${c.peso} | ${String(c.detalle || '').replace(/\n/g, ' ').replace(/\|/g, '/')} |`);
  L.push('');
  if (juez) {
    L.push('## Juez', '', '| Puntaje | Criterio | Por qué |', '|---|---|---|');
    for (const c of juez.criterios) L.push(`| ${c.puntaje}/5 | ${c.titulo} | ${c.por_que.replace(/\|/g, '/')} |`);
    L.push('', `**Lo mejor:** ${juez.lo_mejor}`, '', `**Lo peor:** ${juez.lo_peor}`, '', '**Sugerencias:**', ...juez.sugerencias.map((s, i) => `${i + 1}. ${s}`), '');
  }
  if (fallas.length) L.push('## Fallas del E2E', '', ...fallas.map((f) => `- ${f}`), '');
  L.push('## Transcript', '', '```', tr, '```', '');
  return { texto: L.join('\n'), total };
}

/** ¿Esta corrida cumple la meta? { ok, falta: [...] } */
function cumpleMeta({ medidas, juez }) {
  const falta = [];
  if (medidas.segundosHastaPropuesta == null || medidas.segundosHastaPropuesta > META.propuesta) falta.push(`propuesta en ${medidas.segundosHastaPropuesta ?? '—'} s`);
  if (medidas.datos == null) falta.push('sin verificador'); else if (medidas.datosSinComprobar) falta.push(`${medidas.datosSinComprobar} sin comprobar`);
  if (juez && (juez.total < META.juez || juez.veredicto !== 'lista')) falta.push(`juez ${juez.total} (${juez.veredicto})`);
  if (!juez && CON_JUEZ) falta.push('sin juez');
  return { ok: !falta.length, falta };
}
const mediana = (xs) => { const a = xs.filter((x) => typeof x === 'number').sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
const promedio = (xs) => { const a = xs.filter((x) => typeof x === 'number'); return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null; };

// ── Principal ─────────────────────────────────────────────────────────────────
const resultados = [];
const tanda = GRABADA ? [['grabada', 1]] : MODELOS.flatMap((m) => Array.from({ length: RONDAS }, (_, i) => [m, i + 1]));
for (const [modelo, ronda] of tanda) {
  const dir = join(SALIDA, `${fechaCorta()}-${GRABADA ? 'grabada' : modelo}${ES_MARTINA ? '' : '-' + SES.id}${RONDAS > 1 ? '-r' + ronda : ''}`); mkdirSync(dir, { recursive: true });
  log(`── ${GRABADA ? 'evaluando ' + GRABADA : 'corrida en vivo con ' + modelo}${RONDAS > 1 ? ` (ronda ${ronda} de ${RONDAS})` : ''} → ${dir}`);
  const r = GRABADA ? await evaluarGrabada({ archivo: GRABADA, dir }) : await correrEnVivo({ modelo, dir });
  writeFileSync(join(dir, 'eventos.json'), JSON.stringify({ origen: GRABADA ? 'grabada' : 'e2e', modelo, generado: new Date().toISOString(), eventos: r.eventos }, null, 1));
  const tr = transcript(r.eventos, r.persona); writeFileSync(join(dir, 'transcript.md'), tr);
  const chequeos = evaluarEventos(r.eventos);
  let juez = null;
  if (CON_JUEZ && ES_MARTINA) {   // los chequeos y el juez están escritos para el guion de Martina
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      juez = await juzgar({ cliente: new Anthropic({ maxRetries: 3, timeout: 180_000 }), modelo: JUEZ, transcript: tr, capturas: r.capturas });
      writeFileSync(join(dir, 'juez.json'), juez.crudo);
    } catch (e) { r.fallas.push('juez: ' + e.message); log('✗ juez:', e.message); }
  }
  const { texto: md, total } = informe({ modelo: GRABADA ? `grabación ${GRABADA}` : modelo, origen: GRABADA ? 'grabación' : `en vivo (${modelo}, effort ${EFFORT})`, chequeos, juez, fallas: r.fallas, transcript: tr });
  writeFileSync(join(dir, 'informe.md'), md);
  writeFileSync(join(dir, 'puntaje.json'), JSON.stringify({ modelo, total, chequeos: chequeos.puntaje, juez: juez ? juez.total : null, veredicto: juez ? juez.veredicto : null, medidas: chequeos.medidas, fallas: r.fallas }, null, 2));
  resultados.push({ modelo: GRABADA ? 'grabada' : modelo, ronda, total, chequeos: chequeos.puntaje, juez: juez ? juez.total : null, veredicto: juez ? juez.veredicto : '—', medidas: chequeos.medidas, dir, fallidos: chequeos.chequeos.filter((c) => !c.ok).map((c) => c.clave), meta: cumpleMeta({ medidas: chequeos.medidas, juez }) });
  console.log(`\n${chequeos.chequeos.map((c) => `${c.ok ? '✓' : '✗'} ${c.titulo}${c.ok ? '' : ' · ' + String(c.detalle || '').replace(/\n/g, ' ').slice(0, 100)}`).join('\n')}`);
  if (juez) console.log(`\nJuez: ${juez.total} (${juez.veredicto}) · lo peor: ${juez.lo_peor}`);
  console.log(`\nPuntaje ${total} / 100 → ${join(dir, 'informe.md')}\n`);
}
if (resultados.length > 1) {
  const L = ['| Modelo | Ronda | Total | Chequeos | Juez | Veredicto | Propuesta | Cierre | Herramientas | Sin comprobar | Meta | Fallidos |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of resultados) L.push(`| ${r.modelo} | ${r.ronda} | ${r.total} | ${r.chequeos} | ${r.juez ?? '—'} | ${r.veredicto} | ${r.medidas.segundosHastaPropuesta ?? '—'} s | ${r.medidas.segundosHastaCierre ?? '—'} s | ${r.medidas.llamadasHerramientas} | ${r.medidas.datosSinComprobar ?? '—'} | ${r.meta.ok ? 'sí' : 'no: ' + r.meta.falta.join(', ')} | ${r.fallidos.join(', ') || '—'} |`);
  // Por modelo: variación de la tanda y si la meta se cumplió entera
  const R = ['', `## Por modelo (meta: propuesta ≤ ${META.propuesta} s · 0 sin comprobar · juez "lista" ≥ ${META.juez}, en todas las corridas)`, '', '| Modelo | Corridas | Propuesta mín / mediana / máx | Chequeos prom. | Juez prom. | Veredictos | Sin comprobar (total) | Meta cumplida |', '|---|---|---|---|---|---|---|---|'];
  for (const modelo of [...new Set(resultados.map((r) => r.modelo))]) {
    const rs = resultados.filter((r) => r.modelo === modelo), props = rs.map((r) => r.medidas.segundosHastaPropuesta);
    const ved = {}; for (const r of rs) ved[r.veredicto] = (ved[r.veredicto] || 0) + 1;
    const cumplen = rs.filter((r) => r.meta.ok).length;
    R.push(`| ${modelo} | ${rs.length} | ${Math.min(...props.filter((x) => x != null))} / ${mediana(props)} / ${Math.max(...props.filter((x) => x != null))} s | ${promedio(rs.map((r) => r.chequeos))} | ${promedio(rs.map((r) => r.juez)) ?? '—'} | ${Object.entries(ved).map(([k, v]) => `${k} ×${v}`).join(', ')} | ${rs.reduce((a, r) => a + (r.medidas.datosSinComprobar || 0), 0)} | ${cumplen === rs.length ? '**sí**' : `no (${cumplen} de ${rs.length})`} |`);
  }
  const comp = join(SALIDA, `${fechaCorta()}-comparacion.md`); writeFileSync(comp, `# Comparación E2E\n\n${L.join('\n')}\n${R.join('\n')}\n`);
  console.log(L.join('\n') + '\n' + R.join('\n') + `\n→ ${comp}`);
} else if (resultados.length === 1) {
  const r = resultados[0]; console.log(`Meta (propuesta ≤ ${META.propuesta} s · 0 sin comprobar · juez "lista" ≥ ${META.juez}): ${r.meta.ok ? 'cumplida' : 'no · falta: ' + r.meta.falta.join(', ')}`);
}
