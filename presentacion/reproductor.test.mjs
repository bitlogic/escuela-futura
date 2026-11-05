import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { autoDe } from './reproductor.js';

const AQUI = dirname(fileURLToPath(import.meta.url));

test('vivo entra en dos tiempos: la banda primero y la demo en el paso 1 (data-demo-paso); volvemos no lleva demo', () => {
  const vivo = readFileSync(join(AQUI, 'slides', 'vivo.html'), 'utf8'), volvemos = readFileSync(join(AQUI, 'slides', 'volvemos.html'), 'utf8');
  assert.match(vivo, /data-demo="escuela"/); assert.match(vivo, /data-demo-paso="1"/); assert.doesNotMatch(volvemos, /data-demo=/);
});

test('autoDe: los segundos por paso de data-auto, y null donde la lista se acaba', () => {
  assert.equal(autoDe('22', 0), 22); assert.equal(autoDe('22', 1), null);
  assert.equal(autoDe('5, 25', 0), 5); assert.equal(autoDe('5, 25', 1), 25); assert.equal(autoDe('5, 25', 2), null);
  assert.equal(autoDe(null, 0), null); assert.equal(autoDe('', 0), null); assert.equal(autoDe('0,x', 0), null);
});

test('la cadena automática va de fachada a carrera (láminas 3 a 6) y se frena en entrevista, con el cartel en pantalla', () => {
  const deck = JSON.parse(readFileSync(join(AQUI, 'deck.json'), 'utf8'));
  const auto = (id) => (readFileSync(join(AQUI, 'slides', id + '.html'), 'utf8').match(/data-auto="([^"]*)"/) || [])[1];
  const pasos = (id) => { const s = readFileSync(join(AQUI, 'slides', id + '.html'), 'utf8').split('<aside>')[0]; return Math.max(0, ...[...s.matchAll(/data-paso="(\d+)"/g)].map((m) => Number(m[1]))); };
  const conAuto = deck.order.filter((id) => auto(id));
  assert.deepEqual(conAuto, ['fachada', 'sofia', 'chatgpt', 'carrera', 'gracias']);
  // gracias (la última) muestra sus pasos sola pero no avanza a ninguna lámina: la lista de data-auto mide lo mismo que sus pasos
  assert.equal(autoDe(auto('gracias'), pasos('gracias')), null, 'gracias no avanza después del último paso');
  assert.ok(pasos('gracias') >= 2 && autoDe(auto('gracias'), pasos('gracias') - 1) > 0, 'gracias muestra sus pasos sola');
  conAuto.splice(conAuto.indexOf('gracias'), 1);
  assert.equal(auto('equipo'), undefined, 'equipo es manual: las presentaciones van a nuestro ritmo; la tecla que sale de ahí arranca la cadena');
  assert.equal(deck.order.indexOf('fachada'), 2, 'fachada es la lámina 3');
  assert.equal(deck.order.indexOf('entrevista'), 6, 'entrevista es la lámina 7');
  for (const id of conAuto) assert.equal(autoDe(auto(id), pasos(id)) != null, true, id + ' avanza sola a la siguiente');
  assert.equal(auto('entrevista'), undefined, 'entrevista no avanza sola: el cartel queda en pantalla hasta la tecla');
  for (const id of conAuto) for (let p = 0; p < pasos(id); p++) assert.ok(autoDe(auto(id), p) > 0, id + ' paso ' + p + ' tiene tiempo');
});
