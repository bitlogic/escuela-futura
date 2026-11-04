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
  assert.deepEqual(leerPlaca('der clara'), { pos: 'der', clara: true, propia: false });
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
