import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluarEventos, transcript } from './chequeos.mjs';

const idx = JSON.parse(readFileSync(new URL('../stage/corridas/index.json', import.meta.url), 'utf8'));
const corrida = JSON.parse(readFileSync(new URL('../stage/corridas/' + idx.predeterminada, import.meta.url), 'utf8'));

test('la corrida grabada predeterminada se evalúa y pasa lo esencial del guion', () => {
  const r = evaluarEventos(corrida.eventos);
  const por = Object.fromEntries(r.chequeos.map((c) => [c.clave, c]));
  assert.ok(r.puntaje >= 0 && r.puntaje <= 100);
  assert.ok(por.reparto.ok, por.reparto.detalle);
  assert.ok(por.propuesta_un_caso.ok, por.propuesta_un_caso.detalle);
  assert.ok(por.limite.ok, por.limite.detalle);
  assert.equal(typeof r.medidas.segundosHastaPropuesta, 'number');
  assert.ok(r.chequeos.every((c) => typeof c.ok === 'boolean' && c.peso > 0 && c.titulo));
  assert.ok(por.tablero);   // existe aunque la grabación vieja no traiga tareas
});

test('transcript: una línea por mensaje con hora y destino', () => {
  const t = transcript(corrida.eventos, 'Alfredo');
  assert.match(t, /^\[0:00\] Alfredo \(persona\): Antes del parcial/);
  assert.match(t, /Coordinación → Bienestar: @Bienestar/);
});

test('sin eventos todo falla pero no explota', () => {
  const r = evaluarEventos([]);
  assert.equal(r.puntaje, 0); assert.ok(r.chequeos.length >= 10);
});
