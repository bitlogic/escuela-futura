import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarPack, parsePersona } from './personas.mjs';
import { crearResolutor } from './menciones.mjs';
import { TOOLS } from '../mcp-escuela/herramientas.mjs';
import { HERRAMIENTAS_TABLERO } from './tablero.mjs';

test('el pack carga seis agentes, cada uno con herramientas que existen', () => {
  const { instrucciones, agentes } = cargarPack();
  assert.equal(agentes.length, 6);
  assert.match(instrucciones, /enviar_mensaje/);
  const nombres = new Set([...TOOLS, ...HERRAMIENTAS_TABLERO].map((t) => t.name));
  for (const a of agentes) { assert.ok(a.herramientas.length, a.id); for (const h of a.herramientas) assert.ok(nombres.has(h), `${a.id}: ${h}`); assert.doesNotMatch(a.prompt, /^---/); }
  assert.deepEqual(agentes.find((a) => a.id === 'coordinacion').herramientas, ['buscar_estudiantes']);
});

test('parsePersona entiende escalares y listas', () => {
  const { meta, body } = parsePersona('---\nname: x\ndisplay_name: "Equis"\ntools:\n  - a\n  - b\nextra: 1\n---\n\nHola.');
  assert.deepEqual(meta, { name: 'x', display_name: 'Equis', tools: ['a', 'b'], extra: '1' }); assert.equal(body, 'Hola.');
});

test('menciones: nombres sin tildes, todos, persona, y mención seguida de palabra en mayúscula', () => {
  const { agentes } = cargarPack();
  const r = crearResolutor({ agentes, persona: { id: 'persona:direccion', nombre: 'Dirección', alias: ['direccion', 'director', 'directora'] } });
  assert.deepEqual(r('@coordinacion y @Tutor', { de: 'advisor' }).a, ['coordinacion', 'tutor']);
  assert.deepEqual(r('@Bienestar Revisá a Martina', { de: 'coordinacion' }).a, ['bienestar']);
  assert.deepEqual(r('@Director listo, @directora', { de: 'coordinacion' }).a, ['persona:direccion']);
  assert.equal(r('@todos', { de: 'tutor' }).a.length, 5);
  assert.deepEqual(r('nada', { de: 'tutor', porDefecto: ['tutor', 'coordinacion'] }).a, ['coordinacion']);
});
