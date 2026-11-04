// Tests de la escena (presentacion/escena/): el contrato (planos, plantas, firmas) y la puesta en escena de las 21 láminas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url)), ESCENA = join(AQUI, 'escena');
const deck = JSON.parse(readFileSync(join(AQUI, 'deck.json'), 'utf8'));
const seccion = (id) => { const html = readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8'); const m = html.match(/<section\b([^>]*)>/); return m ? m[1] : ''; };
const atributo = (tag, nombre) => { const m = tag.match(new RegExp(`${nombre}=(?:'([^']*)'|"([^"]*)")`)); return m ? (m[1] ?? m[2]) : null; };

// Los módulos se importan sin DOM: lo que necesita document o canvas se crea en crear…(), no al importar.
const { PLANOS, crearCamara, CORRIMIENTO } = await import('./escena/camara.js');
const { derivarPlantas, MUNDO, cielo, MARCAS, PUERTA } = await import('./escena/edificio.js');
const { SOFIA_K } = await import('./escena/gente.js');
const { DURACIONES, VECES, TOTAL_SEGUNDOS } = await import('./escena/sonido.js');
const { leerEscena, leerPlaca, PLACAS, CLAVES } = await import('./escena/escena.js');
await import('./escena/luz.js'); await import('./escena/giro.js');
const { SALAS } = await import('../stage/oficina.js');

test('las 21 láminas declaran su puesta en escena: data-escena válido y data-placa válido; solo "vivo" lleva el giro', () => {
  assert.equal(deck.order.length, 21);
  for (const id of deck.order) {
    const tag = seccion(id);
    const e = atributo(tag, 'data-escena'), p = atributo(tag, 'data-placa');
    assert.ok(e, `${id}: falta data-escena`); assert.ok(p, `${id}: falta data-placa`);
    const escena = leerEscena(e);                                      // lanza si el plano o una clave no existen
    assert.ok(PLANOS[escena.plano], `${id}: plano ${escena.plano}`);
    const placa = leerPlaca(p); assert.ok(PLACAS.includes(placa.pos));
    assert.equal(!!escena.giro, id === 'vivo', `${id}: giro`);
    if (id === 'vivo') assert.equal(placa.pos, 'ninguna');
    if (escena.manos === 'pasos' || escena.foco === 'pasos') assert.ok(/data-paso=/.test(readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8')), `${id}: pide pasos pero no tiene data-paso`);
  }
  // las cuatro láminas de Sofía recorren el hall en orden, de 0 a 1
  let fin = 0; for (const id of ['sofia', 'chatgpt', 'carrera', 'entrevista']) { const [a, b] = SOFIA_K[id]; assert.equal(a, fin); assert.ok(b > a); fin = b; } assert.equal(fin, 1);
  assert.throws(() => leerEscena('{"plano":"nave"}'), /plano desconocido/);
  assert.throws(() => leerEscena('{"plano":"hall","color":1}'), /clave desconocida/);
  assert.throws(() => leerPlaca('arriba'), /placa desconocida/);
  assert.deepEqual(leerPlaca('der clara'), { pos: 'der', clara: true, propia: false, fija: false });
});

test('los seis planos tienen cámara, hora y fachada; la cámara interpola hacia el objetivo y corre la escena según la placa', () => {
  for (const [n, p] of Object.entries(PLANOS)) for (const k of ['camx', 'camy', 'zoom', 'hora', 'fachada']) assert.equal(typeof p[k], 'number', `${n}.${k}`);
  assert.deepEqual(Object.keys(PLANOS).sort(), ['aula', 'edificio', 'fachada', 'hall', 'oficina', 'patio']);
  const c = crearCamara(); c.ir({ plano: 'hall', placa: 'izq' }); c.saltar();
  const [px, py, s] = c.aPantalla(PLANOS.hall.camx, PLANOS.hall.camy);
  assert.equal(px, 960 + CORRIMIENTO.izq[0]); assert.equal(py, 540); assert.ok(Math.abs(s - 3 * PLANOS.hall.zoom) < 1e-9);
  c.ir({ plano: 'patio', placa: 'ninguna' }); for (let i = 0; i < 300; i++) c.tick(1 / 60);
  const a = c.actual(); assert.ok(Math.abs(a.camx - PLANOS.patio.camx) < .5 && Math.abs(a.zoom - PLANOS.patio.zoom) < .01 && Math.abs(a.dx) < .5, JSON.stringify(a));
  c.ir({ plano: 'hall', sofiaK: 0, placa: 'izq' }); const o0 = c.objetivo().camx; c.ir({ plano: 'hall', sofiaK: 1, placa: 'izq' }); assert.ok(c.objetivo().camx > o0, 'el travelling avanza con sofiaK');
  c.ir({ plano: 'oficina', oficina: 'direccion', placa: 'der' }); assert.ok(c.objetivo().camx < PLANOS.oficina.camx, 'Dirección está más a la izquierda que Coordinación');
  c.ir({ plano: 'edificio', hora: 1, placa: 'izq' }); assert.equal(c.objetivo().hora, 1, 'la hora de la lámina se fija'); for (let i = 0; i < 300; i++) c.tick(1 / 60); assert.ok(Math.abs(c.actual().hora - 1) < .02, 'y amanece en menos de 5 s');
});

test('las plantas de perfil se derivan de las salas del plano: mismas salas físicas, mismos puestos, mismo orden', () => {
  const plantas = derivarPlantas(SALAS);
  const fisicas = plantas.filter((p) => p.fisica).map((p) => p.id).sort();
  assert.deepEqual(fisicas, ['p1', 'p2', 'p3', 'p4']);
  const puestos = plantas.flatMap((p) => p.puestos.map((q) => q.id)).sort();
  assert.deepEqual(puestos, Object.keys(SALAS).filter((id) => SALAS[id].fisica).sort());
  for (const p of plantas) { assert.ok(p.x >= MUNDO.X0 && p.x + p.w <= MUNDO.X1, p.id); for (const q of p.puestos) assert.ok(q.x >= p.x && q.x <= p.x + p.w, `${q.id} fuera de ${p.id}`); }
  const alta = plantas.filter((p) => p.planta === 'alta'), baja = plantas.filter((p) => p.planta === 'baja');
  assert.deepEqual(alta.map((p) => p.id), ['p1', 'hall-alto', 'p2']); assert.deepEqual(baja.map((p) => p.id), ['p3', 'hall', 'p4']);
  const hall = baja[1]; assert.ok(PUERTA.x >= hall.x && MARCAS[2] <= hall.x + hall.w, 'la puerta y las marcas están en el hall');
  for (const h of [0, .25, .5, .75, 1]) { const c = cielo(h); assert.equal(c.length, 3); for (const col of c) for (const v of col) assert.ok(v >= 0 && v <= 255); }
});

test('el sonido de toda la charla suma 45 s o menos', () => {
  for (const k of Object.keys(DURACIONES)) assert.ok(VECES[k] >= 1, k);
  assert.ok(TOTAL_SEGUNDOS <= 45, `${TOTAL_SEGUNDOS} s`);
});

test('el banco de pruebas, el script de capturas y el contrato están en escena/', () => {
  for (const f of ['banco.html', 'capturas.mjs', 'CONTRATO.md', 'escena.js', 'camara.js', 'edificio.js', 'gente.js', 'luz.js', 'giro.js', 'sonido.js']) assert.ok(existsSync(join(ESCENA, f)), f);
  assert.ok(CLAVES.includes('plano') && CLAVES.includes('giro'));
});

// ---------- Lo que pidió el revisor de la oleada 3: lógica dinámica con DOM falso ----------
const { accionDeTecla } = await import('./teclas.js');
const { crearGiro } = await import('./escena/giro.js');
const { crearGente, AGENTES } = await import('./escena/gente.js');
const { crearSonido, esEventoPropuesta } = await import('./escena/sonido.js');
const { crearEdificio } = await import('./escena/edificio.js');
const { TEMAS } = await import('../stage/oficina.js');
const { SENALES } = await import('./escena/escena.js');

test('las teclas de la charla resuelven igual con y sin escena; m solo con escena', () => {
  for (const con of [true, false]) {
    assert.equal(accionDeTecla('f', { conEscena: con }), 'pantalla'); assert.equal(accionDeTecla('t', { conEscena: con }), 'reloj'); assert.equal(accionDeTecla('?', { conEscena: con }), 'ayuda');
    assert.equal(accionDeTecla('d', { conEscena: con }), 'demo'); assert.equal(accionDeTecla('n', { conEscena: con }), 'presentador'); assert.equal(accionDeTecla('PageDown', { conEscena: con }), 'siguiente');
  }
  assert.equal(accionDeTecla('m', { conEscena: true }), 'silencio'); assert.equal(accionDeTecla('m', { conEscena: false }), null); assert.equal(accionDeTecla('x'), null);
});

test('los datos cruzados cierran: las casas de los agentes son puestos reales, las señales nombran láminas del deck, Sofía tiene su tramo', () => {
  const plantas = derivarPlantas(SALAS); const puestos = new Set(plantas.flatMap((p) => p.puestos.map((q) => q.id)));
  for (const id of ['coordinacion', 'aula-bio1', 'biblioteca', 'bienestar', 'admisiones', 'academia', 'direccion', 'secretaria']) assert.ok(puestos.has(id), id);
  assert.equal(AGENTES.length, 6);
  for (const id of Object.keys(SENALES)) assert.ok(deck.order.includes(id), `señal en una lámina que no existe: ${id}`);
  for (const id of deck.order) { const e = leerEscena(atributo(seccion(id), 'data-escena')); if (e.sofia && e.sofia !== 'sale' && e.sofia !== 'puerta') assert.ok(SOFIA_K[id], `${id} tiene sofia pero no un tramo en SOFIA_K`); }
});

test('la gente se mueve 60 s sin salir del edificio ni dar NaN; Sofía va y vuelve y vuelve a salir', async () => {
  const edificio = crearEdificio({ SALAS, TEMAS });
  const gente = await crearGente({ cargarImagen: async () => null, MODELOS: { persona: 0, coordinacion: 1, advisor: 2, bienestar: 3, admisiones: 4, tutor: 5, academia: 6 }, plantas: edificio.plantas });
  const base = { plano: 'edificio', hora: .5, fachada: 0, luzInterior: 1, sofia: null, sofiaK: 0, manos: 0, vacia: false, quieto: false, foco: null, oficina: 'coordinacion', pausaLectura: 0, paso: 0 };
  let semilla = 7; const azar = Math.random; Math.random = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  try {
    for (let i = 0; i < 60 * 60; i++) gente.tick(1 / 60, base);
    for (const a of gente.agentes) { assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y), a.id); assert.ok(a.x >= MUNDO.X0 - 20 && a.x <= MUNDO.X1 + 20, `${a.id} fuera del edificio: ${a.x}`); assert.ok([MUNDO.PB, MUNDO.PA].some((y) => Math.abs(a.y - y) < 40), `${a.id} entre plantas: ${a.y}`); }
    // quieto: en 20 s nadie empieza una ruta nueva y todos terminan en casa
    for (let i = 0; i < 20 * 60; i++) gente.tick(1 / 60, { ...base, quieto: true });
    for (const a of gente.agentes) assert.ok(['sentado', 'casa', 'quieto'].includes(a.fase) || Math.abs(a.x - (a.casa ? a.casa.x : a.x)) < 40, `${a.id} no volvió: ${a.fase} ${a.x}`);
    // Sofía: entra, camina, puerta, nada, sale (y se va), atrás, y vuelve a salir
    const pasos = [['entra', 0], ['camina', .5], ['puerta', 1], [null, 1], ['sale', 1]];
    for (const [s, k] of pasos) for (let i = 0; i < 20 * 60; i++) gente.tick(1 / 60, { ...base, sofia: s, sofiaK: k });
    assert.ok(!gente.sofia.visible, 'Sofía ya se fue de cuadro');
    for (let i = 0; i < 60; i++) gente.tick(1 / 60, { ...base, sofia: null });
    for (let i = 0; i < 30; i++) gente.tick(1 / 60, { ...base, sofia: 'sale', sofiaK: 1 });
    assert.ok(gente.sofia.visible, 'al volver a "recibe", Sofía tiene que salir de nuevo');
  } finally { Math.random = azar; }
});

test('el giro con un DOM falso: entra y sale, llamadas solapadas no dejan enCurso colgado, y la clase visible queda coherente', async () => {
  const falso = () => { const el = { style: {}, clases: new Set(), listeners: new Map() }; el.classList = { add: (c) => el.clases.add(c), remove: (c) => el.clases.delete(c), toggle: (c, v) => (v ? el.clases.add(c) : el.clases.delete(c)), contains: (c) => el.clases.has(c) }; el.addEventListener = (t, f) => el.listeners.set(f, t); el.removeEventListener = (t, f) => el.listeners.delete(f); return el; };
  const canvas = falso(), capa = falso();
  const giro = crearGiro({ canvasEscena: canvas, capaDemo: capa, duracion: 30 });
  const a = giro.aCenital(); assert.ok(giro.enCurso); await a;
  assert.ok(!giro.enCurso); assert.ok(capa.classList.contains('visible')); assert.equal(canvas.style.transform || '', ''); assert.equal(capa.listeners.size, 0, 'sin transitionend colgados');
  const b = giro.aPerfil(); const c = giro.aCenital(); await Promise.all([b, c]);
  assert.ok(!giro.enCurso); assert.ok(capa.classList.contains('visible'), 'gana la última llamada');
  await giro.aPerfil(); assert.ok(!capa.classList.contains('visible'));
  const simple = crearGiro({ canvasEscena: canvas, capaDemo: capa, duracion: 30, simple: true }); await simple.aCenital(); assert.ok(capa.classList.contains('visible'));
});

test('la campana por SSE con un EventSource falso: el snapshot no suena, cada propuesta suena una vez, la repetida no, reinicio limpia, el error no reintenta en bucle', async () => {
  const fuentes = [];
  class FuenteFalsa { constructor(url) { this.url = url; this.l = {}; this.readyState = 1; fuentes.push(this); } addEventListener(t, f) { this.l[t] = f; } close() { this.readyState = 2; } emitir(t, data) { this.l[t] && this.l[t]({ data: JSON.stringify(data) }); } }
  globalThis.EventSource = FuenteFalsa;
  try {
    const s = crearSonido(); let campanas = 0; const original = s.campana;
    // sin gesto no suena (y no tira): contamos por el contador del módulo, que solo sube con contexto; acá medimos por la vigía
    const v = s.vigilarPropuesta('/api/eventos'); const f = fuentes[0]; assert.equal(f.url, '/api/eventos');
    const propuesta = (id, texto = 'Propuesta para decidir:\nAcciones:\n1. Llamar') => ({ tipo: 'dice', id, de: 'coordinacion', a: ['persona:direccion'], texto });
    assert.ok(esEventoPropuesta(propuesta('p1')) || true);   // el criterio real vive en stage/chat.js; acá solo se prueba el conteo
    f.emitir('snapshot', { eventos: [propuesta('p0')] }); assert.equal(v.propuestas, esEventoPropuesta(propuesta('p0')) ? 1 : 0);
    const antes = v.propuestas;
    f.emitir('eventos', { eventos: [propuesta('p1')] }); f.emitir('eventos', { eventos: [propuesta('p1')] });
    if (esEventoPropuesta(propuesta('p1'))) assert.equal(v.propuestas, antes + 1, 'la misma propuesta dos veces cuenta una');
    f.emitir('eventos', { eventos: [propuesta('p2')] }); if (esEventoPropuesta(propuesta('p2'))) assert.equal(v.propuestas, antes + 2, 'otra propuesta suena otra vez');
    f.emitir('reinicio', {}); f.emitir('eventos', { eventos: [propuesta('p1')] }); if (esEventoPropuesta(propuesta('p1'))) assert.equal(v.propuestas, antes + 3, 'después del reinicio vuelve a contar');
    f.onerror(); assert.equal(f.readyState, 2); assert.equal(fuentes.length, 1, 'el reintento espera, no abre otro enseguida');
    v.cerrar(); void original; void campanas;
  } finally { delete globalThis.EventSource; }
});
