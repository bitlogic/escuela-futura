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
