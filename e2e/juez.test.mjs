import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretar, armarPrompt, RUBRICA } from './juez.mjs';

test('interpretar: toma el JSON aunque venga con cercas, completa criterios que faltan y calcula el total', () => {
  const r = interpretar('```json\n{"criterios":[{"clave":"objetivo_no_pregunta","puntaje":5,"por_que":"x"},{"clave":"persona_decide","puntaje":3,"por_que":"y"}],"veredicto":"casi","lo_mejor":"a","lo_peor":"b","sugerencias":["1","2","3","4"]}\n```');
  assert.equal(r.criterios.length, RUBRICA.length); assert.equal(r.criterios[0].puntaje, 5); assert.equal(r.criterios[4].puntaje, 3);
  assert.equal(r.criterios[1].puntaje, 1);   // el que falta vale 1
  assert.equal(r.sugerencias.length, 3); assert.equal(r.veredicto, 'casi');
  assert.equal(r.total, Math.round(100 * (1 + 0.5) / RUBRICA.length));
  assert.throws(() => interpretar('nada'), /no devolvió JSON/);
});

test('armarPrompt nombra las capturas y los criterios', () => {
  const p = armarPrompt({ transcript: 'T', capturas: [{ nombre: '01-pensando.png' }, { nombre: '03-propuesta.png' }] });
  assert.match(p, /2 captura\(s\)/); assert.match(p, /01-pensando\.png, 03-propuesta\.png/); assert.match(p, /10\. no_guionado/);
});
