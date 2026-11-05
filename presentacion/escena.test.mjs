// Tests de la escena (presentacion/escena/): el contrato (planos, plantas, firmas) y la puesta en escena de las 23 láminas.
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
const { derivarPlantas, MUNDO, cielo, MARCAS, PUERTA, ventanaPrendida } = await import('./escena/edificio.js');
const { SOFIA_K, CALLE } = await import('./escena/gente.js');
const { leerEscena, leerPlaca, PLACAS, CLAVES, CLAVES_VIAJE, SOFIAS } = await import('./escena/escena.js');
await import('./escena/luz.js'); await import('./escena/giro.js');
const { SALAS } = await import('../stage/oficina.js');

// La portada y "quiénes somos" van sin escena a propósito (suspenso: la escuela aparece recién en la lámina 3, "fachada");
// la tesis también (4/11): la lámina entera, la escuela se apaga un minuto.
const SIN_ESCENA = ['cover', 'equipo', 'tesis'];
test('las 23 láminas declaran su puesta en escena (salvo tres): data-escena válido y data-placa válido; solo "vivo" y "volvemos" llevan el giro', () => {
  assert.equal(deck.order.length, 23);
  assert.deepEqual(deck.order.slice(0, 3), ['cover', 'equipo', 'fachada'], 'la escuela aparece en la tercera lámina');
  for (const id of deck.order) {
    const tag = seccion(id);
    const e = atributo(tag, 'data-escena'), p = atributo(tag, 'data-placa');
    if (SIN_ESCENA.includes(id)) { assert.ok(!e && !p, `${id}: va sin escena`); continue; }
    assert.ok(e, `${id}: falta data-escena`); assert.ok(p, `${id}: falta data-placa`);
    const escena = leerEscena(e);                                      // lanza si el plano o una clave no existen
    assert.ok(PLANOS[escena.plano], `${id}: plano ${escena.plano}`);
    const placa = leerPlaca(p); assert.ok(PLACAS.includes(placa.pos));
    assert.equal(!!escena.giro, id === 'vivo' || id === 'volvemos', `${id}: giro`);   // volvemos: si d vuelve a traer la demo desde ahí, también gira
    if (id === 'vivo') assert.equal(placa.pos, 'arriba', 'vivo: el título arriba (4/11); durante el giro la placa se apaga sola');
    if (placa.pos === 'llamadas') assert.ok(/class="[^"]*\bllamada\b/.test(readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8')), `${id}: placa llamadas pero ningún texto con .llamada`);
    if (escena.manos === 'pasos' || escena.foco === 'pasos') assert.ok(/data-paso=/.test(readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8')), `${id}: pide pasos pero no tiene data-paso`);
  }
  // las cuatro láminas de Sofía recorren el hall en orden, de 0 a 1
  let fin = 0; for (const id of ['sofia', 'chatgpt', 'carrera', 'entrevista']) { const [a, b] = SOFIA_K[id]; assert.equal(a, fin); assert.ok(b > a); fin = b; } assert.equal(fin, 1);
  assert.throws(() => leerEscena('{"plano":"nave"}'), /plano desconocido/);
  assert.throws(() => leerEscena('{"plano":"hall","color":1}'), /clave desconocida/);
  assert.throws(() => leerPlaca('centro'), /placa desconocida/);
  assert.deepEqual(leerPlaca('der clara'), { pos: 'der', clara: true, propia: false, fija: false });
  assert.deepEqual(leerPlaca('llamadas clara').pos, 'llamadas'); assert.equal(leerPlaca('arriba').pos, 'arriba');
  for (const pos of PLACAS) assert.ok(CORRIMIENTO[pos], `${pos} tiene corrimiento`);
  // el viaje (4/11): claves acotadas, números, segundos positivos
  assert.deepEqual(leerEscena('{"plano":"fachada","viaje":{"zoom":1.1,"hora":0.3,"luzInterior":1,"segundos":18}}').viaje.segundos, 18);
  assert.throws(() => leerEscena('{"plano":"fachada","viaje":{"sofia":1}}'), /clave desconocida en viaje/);
  assert.throws(() => leerEscena('{"plano":"fachada","viaje":{"zoom":"x"}}'), /número/);
  assert.throws(() => leerEscena('{"plano":"fachada","viaje":{"segundos":0}}'), /positivo/);
  assert.throws(() => leerEscena('{"plano":"fachada","viaje":[1]}'), /objeto/);
  assert.ok(CLAVES_VIAJE.includes('luzInterior') && !CLAVES_VIAJE.includes('plano'));
  assert.ok(SOFIAS.includes('calle') && SOFIAS.includes('frente'));
  assert.throws(() => leerEscena('{"plano":"hall","sofia":"vuela"}'), /sofia desconocida/);
  // fachada aparece con las ventanas apagadas y un viaje que las prende; gracias las apaga de a una
  const fachada = leerEscena(atributo(seccion('fachada'), 'data-escena')); assert.equal(fachada.luzInterior, 0); assert.equal(fachada.viaje.luzInterior, 1);
  const gracias = leerEscena(atributo(seccion('gracias'), 'data-escena')); assert.ok(gracias.viaje.luzInterior < .3 && gracias.viaje.hora === .5);
  assert.equal(gracias.saludo, true, 'en gracias los agentes salen a saludar'); assert.ok(CLAVES.includes('saludo'));
  // las cuatro láminas de la calle: Sofía afuera, la misma cámara; entrevista la deja frente a la puerta
  for (const id of ['sofia', 'chatgpt', 'carrera']) { const e = leerEscena(atributo(seccion(id), 'data-escena')); assert.equal(e.sofia, 'calle', id); assert.equal(e.plano, 'edificio'); }
  assert.equal(leerEscena(atributo(seccion('entrevista'), 'data-escena')).sofia, 'frente');
  // la esfera del deck se fue (4/11): en la portada están los seis agentes esperando (canvas data-portada); ninguna lámina lleva x-embed
  for (const id of deck.order) assert.equal(/<x-embed/.test(readFileSync(join(AQUI, 'slides', `${id}.html`), 'utf8')), false, `${id}: esfera`);
  assert.ok(/<canvas data-portada/.test(readFileSync(join(AQUI, 'slides', 'cover.html'), 'utf8')), 'la portada lleva a los seis agentes');
  assert.ok(!/elenco/.test(readFileSync(join(AQUI, 'slides', 'cover.html'), 'utf8')), 'la portada va sin nombres');
});

test('las ventanas de la fachada se prenden y se apagan de a una según su umbral; Coordinación y Bienestar quedan hasta el final', () => {
  assert.equal(ventanaPrendida({ umbral: null }, { luzInterior: .4 }), .4, 'sin umbral, todas a la vez');
  assert.equal(ventanaPrendida({ umbral: .5 }, { luzInterior: 1 }), 1); assert.equal(ventanaPrendida({ umbral: .5 }, { luzInterior: .5 }), 0); assert.ok(Math.abs(ventanaPrendida({ umbral: .5 }, { luzInterior: .54 }) - .5) < 1e-9);
  assert.equal(ventanaPrendida({ umbral: .5 }, {}), 1, 'sin luzInterior en el estado, prendida');
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

test('el banco de pruebas, el script de capturas y el contrato están en escena/', () => {
  for (const f of ['banco.html', 'capturas.mjs', 'CONTRATO.md', 'escena.js', 'camara.js', 'edificio.js', 'gente.js', 'luz.js', 'giro.js']) assert.ok(existsSync(join(ESCENA, f)), f);
  assert.ok(CLAVES.includes('plano') && CLAVES.includes('giro'));
  assert.ok(!existsSync(join(ESCENA, 'sonido.js')), 'la charla va sin sonido (4/11): sonido.js no vuelve');
});

// ---------- Lo que pidió el revisor de la oleada 3: lógica dinámica con DOM falso ----------
const { accionDeTecla } = await import('./teclas.js');
const { crearGiro } = await import('./escena/giro.js');
const { crearGente, AGENTES } = await import('./escena/gente.js');
const { crearEdificio } = await import('./escena/edificio.js');
const { TEMAS } = await import('../stage/oficina.js');

test('las teclas de la charla resuelven igual con y sin escena; p solo con escena, m es la música', () => {
  for (const con of [true, false]) {
    assert.equal(accionDeTecla('f', { conEscena: con }), 'pantalla'); assert.equal(accionDeTecla('t', { conEscena: con }), 'reloj'); assert.equal(accionDeTecla('?', { conEscena: con }), 'ayuda');
    assert.equal(accionDeTecla('d', { conEscena: con }), 'demo'); assert.equal(accionDeTecla('n', { conEscena: con }), 'presentador'); assert.equal(accionDeTecla('PageDown', { conEscena: con }), 'siguiente');
  }
  assert.equal(accionDeTecla('m', { conEscena: true }), 'musica'); assert.equal(accionDeTecla('m', { conEscena: false }), 'musica'); assert.equal(accionDeTecla('x'), null);
  assert.equal(accionDeTecla('p', { conEscena: true }), 'hd'); assert.equal(accionDeTecla('p', { conEscena: false }), null);
});

test('los datos cruzados cierran: las casas de los agentes son puestos reales, Sofía tiene su tramo', () => {
  const plantas = derivarPlantas(SALAS); const puestos = new Set(plantas.flatMap((p) => p.puestos.map((q) => q.id)));
  for (const id of ['coordinacion', 'aula-bio1', 'biblioteca', 'bienestar', 'admisiones', 'academia', 'direccion', 'secretaria']) assert.ok(puestos.has(id), id);
  assert.equal(AGENTES.length, 6);
  for (const id of deck.order) { const e = leerEscena(atributo(seccion(id), 'data-escena')); if (e && e.sofia && !['sale', 'puerta', 'frente'].includes(e.sofia)) assert.ok(SOFIA_K[id], `${id} tiene sofia pero no un tramo en SOFIA_K`); }
  assert.ok(CALLE.desde < CALLE.hasta && CALLE.hasta === PUERTA.x + PUERTA.w / 2 && CALLE.y > MUNDO.SUELO, 'la calle termina en la puerta y va por debajo del suelo del edificio');
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
    // por la calle (4/11): entra desde fuera de cuadro, avanza con sofiaK (no con el tiempo) y en "frente" queda en la puerta
    for (let i = 0; i < 60; i++) gente.tick(1 / 60, { ...base, sofia: null });
    gente.tick(1 / 60, { ...base, sofia: 'calle', sofiaK: 0 }); assert.ok(gente.sofia.x < CALLE.desde && gente.sofia.y === CALLE.y, 'arranca fuera de cuadro, en la vereda');
    for (let i = 0; i < 10 * 60; i++) gente.tick(1 / 60, { ...base, sofia: 'calle', sofiaK: 0 }); assert.ok(Math.abs(gente.sofia.x - CALLE.desde) < 1, 'con sofiaK 0 se queda al principio de la calle');
    for (let i = 0; i < 30 * 60; i++) gente.tick(1 / 60, { ...base, sofia: 'calle', sofiaK: .5 }); assert.ok(Math.abs(gente.sofia.x - (CALLE.desde + CALLE.hasta) / 2) < 1, 'a mitad de camino con sofiaK .5');
    for (let i = 0; i < 30 * 60; i++) gente.tick(1 / 60, { ...base, sofia: 'frente', sofiaK: 1 }); assert.ok(Math.abs(gente.sofia.x - CALLE.hasta) < 1 && !gente.sofia.moviendo, 'frente a la puerta, quieta');
    for (let i = 0; i < 30; i++) gente.tick(1 / 60, { ...base, sofia: 'sale', sofiaK: 1 }); assert.ok(gente.sofia.visible && gente.sofia.y === CALLE.y, 'y de ahí sale por la puerta');
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
