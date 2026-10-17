import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiar, trozos, bloques, primeraLinea, crearHilo } from './chat.js';

test('limpiar saca negritas y títulos y colapsa saltos', () => {
  assert.equal(limpiar('## Hola **mundo**\n\n\n\nchau'), 'Hola mundo\n\nchau');
  assert.equal(limpiar(null), '');
});

test('trozos separa @menciones, con y sin apellido', () => {
  assert.deepEqual(trozos('Hola @Coordinación, mirá'), [
    { texto: 'Hola ', mencion: false }, { texto: '@Coordinación', mencion: true }, { texto: ', mirá', mencion: false }]);
  assert.deepEqual(trozos('@Alfredo Edye tu mensaje')[0], { texto: '@Alfredo Edye', mencion: true });
  assert.deepEqual(trozos(''), []);
});

test('bloques reconoce casos numerados y sus detalles', () => {
  const b = bloques('Propuesta:\n1. Ramiro B. — urgencia alta\n  Por qué: consultó por becas\n  Propuesta: llamada\n2) Martina R.\n- plan de pagos');
  assert.deepEqual(b.map((x) => x.tipo), ['p', 'item', 'detalle', 'detalle', 'item', 'detalle']);
  assert.equal(b[1].n, 1);
  assert.equal(b[5].texto, 'plan de pagos');
});

test('una línea sangrada sin caso previo es un párrafo', () => {
  assert.deepEqual(bloques('  sangrado suelto').map((x) => x.tipo), ['p']);
});

test('primeraLinea saca la marca de lista y salta vacías', () => {
  assert.equal(primeraLinea('\n\n1. Ramiro B.\nmás'), 'Ramiro B.');
  assert.equal(primeraLinea(''), '');
});

test('hilo: no repite claves ni acepta vacíos', () => {
  const h = crearHilo();
  assert.ok(h.agregar({ clave: 'a', autor: 'X', texto: 'uno' }));
  assert.equal(h.agregar({ clave: 'a', autor: 'X', texto: 'otra vez' }), null);
  assert.equal(h.agregar({ clave: 'b', autor: 'X', texto: '  **  ' }), null);
  assert.equal(h.mensajes.length, 1);
});

test('hilo: ordena por t aunque lleguen desordenados, y respeta la llegada si no hay t', () => {
  const h = crearHilo();
  h.agregar({ clave: '2', autor: 'A', texto: 'segundo', t: 20 });
  h.agregar({ clave: '1', autor: 'A', texto: 'primero', t: 10 });
  h.agregar({ clave: '3', autor: 'A', texto: 'tercero', t: 30 });
  assert.deepEqual(h.mensajes.map((m) => m.texto), ['primero', 'segundo', 'tercero']);
  const g = crearHilo();
  g.agregar({ autor: 'A', texto: 'a' }); g.agregar({ autor: 'A', texto: 'b' });
  assert.deepEqual(g.mensajes.map((m) => m.texto), ['a', 'b']);
});

test('hilo: respeta el tope y limpiar reinicia', () => {
  const h = crearHilo({ tope: 3 });
  for (let i = 0; i < 5; i++) h.agregar({ clave: 'k' + i, autor: 'A', texto: 'm' + i });
  assert.deepEqual(h.mensajes.map((m) => m.texto), ['m2', 'm3', 'm4']);
  assert.equal(h.ultimo.texto, 'm4');
  h.limpiar();
  assert.equal(h.mensajes.length, 0);
  assert.ok(h.agregar({ clave: 'k0', autor: 'A', texto: 'otra vez' }));
});

import { destinatario, riesgoDe, nombreDeCaso, esPropuesta, propuesta, redactarDecision, cuerpoDeCaso, parsearAcciones } from './chat.js';

test('destinatario: las @menciones iniciales se separan del texto', () => {
  assert.deepEqual(destinatario('@Coordinación @Bienestar Martina: 2 de 10 clases'), { para: ['Coordinación', 'Bienestar'], resto: 'Martina: 2 de 10 clases' });
  assert.deepEqual(destinatario('Dale. Reparto y vuelvo.'), { para: [], resto: 'Dale. Reparto y vuelvo.' });
  assert.equal(primeraLinea('@Dirección Propuesta para decidir: riesgo'), 'Propuesta para decidir: riesgo');
});

test('bloques: fichas por estudiante, rótulos y casos con nombre y riesgo', () => {
  const b = bloques('Martina R.: 2 de 10 clases desde el 18/8, riesgo alto. Me preocupa.\nTraducción: no puede rendir el 3/11.\nLos otros 21 vienen bien.\nCon lo de Advisor, cambio: primero la deuda.');
  assert.deepEqual(b[0], { tipo: 'ficha', nombre: 'Martina R.', texto: '2 de 10 clases desde el 18/8, riesgo alto. Me preocupa.', riesgo: 'alto' });
  assert.deepEqual(b[1], { tipo: 'rotulo', rotulo: 'Traducción', texto: 'no puede rendir el 3/11.' });
  assert.equal(b[2].tipo, 'p');
  assert.equal(b[3].tipo, 'p');   // "Con lo de Advisor, cambio:" no es un estudiante
  assert.deepEqual(bloques('Me preocupa Joaquín: 0 de 8 clases, riesgo alto.')[0], { tipo: 'ficha', nombre: 'Joaquín', texto: '0 de 8 clases, riesgo alto.', riesgo: 'alto' });
  const it = bloques('1. Martina R., riesgo alto: bloqueada por 3 cuotas (Advisor). Plan de pagos, Secretaría.')[0];
  assert.equal(it.nombre, 'Martina R.'); assert.equal(it.riesgo, 'alto');
  assert.equal(riesgoDe('Lucía: falta los jueves, riesgo medio'), 'medio'); assert.equal(riesgoDe('nada'), null);
  assert.equal(nombreDeCaso('Joaquín M., riesgo alto. Faltó'), 'Joaquín M.'); assert.equal(nombreDeCaso('bloqueada por deuda'), null);
});

test('propuesta: título, casos, pendiente y pregunta', () => {
  const p = propuesta('@Dirección Propuesta para decidir: riesgo en Biología 1 antes del 3/11\n1. Martina R., riesgo alto: 3 cuotas impagas (Advisor), 2 de 10 clases (Bienestar). Plan de pagos, Secretaría; la llama Bienestar.\n2. Joaquín M., riesgo alto: 0 de 8 clases desde el 28/9. Lo llama Bienestar.\nPendiente: los datos no explican por qué Joaquín dejó de venir. ¿Aprobás, editás o rechazás cada caso?');
  assert.ok(esPropuesta('@Dirección Propuesta para decidir: x')); assert.ok(!esPropuesta('Dale. Reparto.'));
  assert.equal(p.titulo, 'riesgo en Biología 1 antes del 3/11');
  assert.equal(p.casos.length, 2); assert.equal(p.casos[1].nombre, 'Joaquín M.'); assert.equal(p.casos[0].riesgo, 'alto');
  assert.equal(p.pendiente, 'los datos no explican por qué Joaquín dejó de venir.');
  assert.equal(p.pregunta, '¿Aprobás, editás o rechazás cada caso?');
});

test('redactarDecision: aprobados juntos, editados y rechazados con su nota', () => {
  const casos = propuesta('1. Martina R., riesgo alto: a.\n2. Joaquín M., riesgo alto: b.\n3. Tomás G., riesgo alto: c.\n4. Lucía P., riesgo medio: d.').casos;
  const t = redactarDecision(casos, { 1: { estado: 'aprobado' }, 4: { estado: 'aprobado' }, 3: { estado: 'editado', nota: 'refuerzo sí, pero con el docente.' }, 2: { estado: 'rechazado', nota: 'lo llamo yo' } });
  assert.equal(t, 'Aprobados Martina R. y Lucía P. Joaquín M.: rechazado, lo llamo yo. Tomás G.: refuerzo sí, pero con el docente.');
  assert.equal(redactarDecision(casos, { 1: { estado: 'aprobado' } }), 'Aprobado Martina R.');
  assert.equal(redactarDecision(casos, {}), '');
});

test('cuerpoDeCaso saca el nombre y el riesgo del principio', () => {
  assert.equal(cuerpoDeCaso('Martina R., riesgo alto: bloqueada por 3 cuotas (Advisor). Plan de pagos.', 'Martina R.'), 'Bloqueada por 3 cuotas (Advisor). Plan de pagos.');
  assert.equal(cuerpoDeCaso('2 de 10 clases desde el 18/8, riesgo alto. Me preocupa.', null), '2 de 10 clases desde el 18/8. Me preocupa.');
  assert.equal(cuerpoDeCaso('Tomás G., riesgo alto en lo académico. TP 2 con 3.', 'Tomás G.'), 'TP 2 con 3.');
});

test('dos fichas en la misma línea se separan', () => {
  const b = bloques('Martina: 5 de 22 clases desde el 18/8, riesgo alto. Lucía: falta los jueves, riesgo medio. Los otros 21 vienen bien.');
  assert.deepEqual(b.map((x) => x.tipo), ['ficha', 'ficha']);   // la frase final queda dentro de la última ficha
  assert.equal(b[1].nombre, 'Lucía'); assert.equal(b[1].riesgo, 'medio');
  assert.equal(bloques('Entra al parcial del 3/11. Ganas sobran.').length, 1);   // una oración común no se parte
});

test('propuesta: las acciones salen de la línea "Acciones:" o de la última oración', () => {
  const p = propuesta('@Dirección Propuesta para decidir: Martina\n1. Martina R., riesgo alto: bloqueada, 3 cuotas desde el 10/8 (Advisor); 2 de 10 clases (Bienestar).\n  Acciones: plan de pagos (Secretaría) · práctica guiada de cruzamientos (docente) · llamada (Bienestar)\nPendiente: por qué. ¿Aprobás, editás o rechazás cada acción?');
  assert.deepEqual(p.casos[0].acciones, [{ texto: 'plan de pagos', quien: 'Secretaría' }, { texto: 'práctica guiada de cruzamientos', quien: 'docente' }, { texto: 'llamada', quien: 'Bienestar' }]);
  assert.equal(p.casos[0].evidencia, 'Martina R., riesgo alto: bloqueada, 3 cuotas desde el 10/8 (Advisor); 2 de 10 clases (Bienestar).');
  const q = propuesta('1. Martina R., riesgo alto: 3 cuotas (Advisor); 2 de 10 clases (Bienestar). Plan de pagos, Secretaría; práctica guiada, docente; llamada, Bienestar.');
  assert.deepEqual(q.casos[0].acciones.map((a) => a.quien), ['Secretaría', 'docente', 'Bienestar']);
  assert.equal(q.casos[0].evidencia, 'Martina R., riesgo alto: 3 cuotas (Advisor); 2 de 10 clases (Bienestar).');
  assert.deepEqual(propuesta('1. Martina R., riesgo alto: 2 de 10 clases. La llama Bienestar.').casos[0].acciones, []);
  assert.deepEqual(parsearAcciones('plan de pagos (Secretaría); llamada, Bienestar; tutoría'), [{ texto: 'plan de pagos', quien: 'Secretaría' }, { texto: 'llamada', quien: 'Bienestar' }, { texto: 'tutoría', quien: '' }]);
});

test('redactarDecision por acción: sí, lo hago yo, no, y la nota', () => {
  const casos = propuesta('1. Martina R., riesgo alto: x.\n  Acciones: plan de pagos (Secretaría) · práctica guiada (docente) · llamada (Bienestar)').casos;
  assert.equal(redactarDecision(casos, { 1: { acciones: { 0: 'si', 1: 'si', 2: 'yo' } } }), 'Plan de pagos y práctica guiada, sí. Llamada: la hago yo.');
  assert.equal(redactarDecision(casos, { 1: { acciones: { 0: 'si', 2: 'no' }, nota: 'la práctica la vemos después del parcial' } }), 'Plan de pagos, sí. Llamada, no. La práctica la vemos después del parcial.');
  assert.equal(redactarDecision(casos, { 1: { acciones: {} } }), '');
  const dos = propuesta('1. Martina R.: x.\n  Acciones: llamada (Bienestar)\n2. Tomás G.: y.\n  Acciones: tutoría (docente)').casos;
  assert.equal(redactarDecision(dos, { 1: { acciones: { 0: 'yo' } }, 2: { acciones: { 0: 'si' } } }), 'Martina R.: Llamada: la hago yo. Tomás G.: Tutoría, sí.');
});

test('dos líneas seguidas con el mismo nombre son una sola ficha', () => {
  const b = bloques('Martina R.: 14 consultas en cruzamientos, 3 de 10 resueltos.\nMartina R.: 5,5 en el Parcial 1, riesgo alto.\nLos otros 23 resuelven 8 de 10.');
  assert.deepEqual(b.map((x) => x.tipo), ['ficha', 'p']);
  assert.equal(b[0].texto, '14 consultas en cruzamientos, 3 de 10 resueltos. 5,5 en el Parcial 1, riesgo alto.');
  assert.equal(b[0].riesgo, 'alto');
  assert.equal(bloques('Martina: a.\nLucía: b.').length, 2);   // nombres distintos siguen siendo dos fichas
});

test('propuesta: las líneas sueltas después de los casos son notas y no se pierden', () => {
  const p = propuesta('@Dirección Propuesta para decidir: Martina en riesgo antes del parcial\n1. Martina R., riesgo alto: bloqueada por 3 cuotas desde el 10/8 (Advisor); 5 de 22 clases (Bienestar).\n   Acciones: plan de pagos (Secretaría) · llamada (Bienestar)\nLo de Advisor cambia el orden: primero la deuda, después la llamada.\nLos otros 23 están al día.\nPendiente: por qué dejó de venir. ¿Qué aprobás, qué cambiás y qué te reservás?');
  assert.deepEqual(p.notas, ['Lo de Advisor cambia el orden: primero la deuda, después la llamada.', 'Los otros 23 están al día.']);
  assert.equal(p.pendiente, 'por qué dejó de venir.'); assert.equal(p.pregunta, '¿Qué aprobás, qué cambiás y qué te reservás?');
  assert.deepEqual(propuesta('1. Martina R., riesgo alto: x.\nNota: Bienestar cambió el orden por el aviso de Advisor.\nPendiente: y. ¿Aprobás?').notas, ['Bienestar cambió el orden por el aviso de Advisor.']);
  const sin = propuesta('1. Martina R., riesgo alto: x.\nLos datos no explican por qué. ¿Aprobás, editás o rechazás?');   // sin rótulo, la última línea con pregunta sigue siendo el pendiente
  assert.equal(sin.pendiente, 'Los datos no explican por qué.'); assert.deepEqual(sin.notas, []);
});
