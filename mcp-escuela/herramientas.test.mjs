import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS, ejecutar } from './herramientas.mjs';

const POR_ESTUDIANTE = ['ver_asistencia', 'ver_actividad_campus', 'ver_alertas_previas', 'ver_uso_tutor', 'ver_notas', 'ver_situacion_administrativa', 'ver_ingresantes'];
const correr = (n, a) => JSON.parse(ejecutar(n, a));

test('las consultas por estudiante aceptan estudiante, estudiantes y curso', () => {
  for (const n of POR_ESTUDIANTE) {
    const props = TOOLS.find((t) => t.name === n).inputSchema.properties;
    assert.deepEqual(Object.keys(props), ['estudiante', 'estudiantes', 'curso'], n);
  }
});

test('con `estudiante` devuelve el objeto solo, como antes', () => {
  const r = correr('ver_asistencia', { estudiante: 'e01' });
  assert.equal(typeof r.estudiante, 'string');
  assert.ok(r.resumen && r.semanas, 'trae asistencia');
  assert.equal(r.estudiantes, undefined);
  assert.ok('hoy' in correr('ver_situacion_administrativa', { estudiante: 'e01' }));
});

test('con `curso` devuelve a todo el curso en una llamada, con id y nombre por ítem', () => {
  const r = correr('ver_asistencia', { curso: 'bio1' });
  assert.equal(r.curso, 'Biología 1');
  assert.equal(r.estudiantes.length, 24);
  assert.deepEqual(r.estudiantes.map((e) => e.id).slice(0, 3), ['e01', 'e02', 'e03']);
  assert.ok(r.estudiantes[0].estudiante && r.estudiantes[0].resumen);
  assert.ok(r.hoy);
  assert.equal(correr('ver_notas', { curso: 'Biología 1' }).estudiantes.length, 24);
});

test('con `estudiantes` devuelve esa lista, por id o nombre, y acepta una cadena con comas', () => {
  const r = correr('ver_situacion_administrativa', { estudiantes: ['e01', 'e03'] });
  assert.deepEqual(r.estudiantes.map((e) => e.id), ['e01', 'e03']);
  assert.equal(r.curso, undefined);
  assert.deepEqual(correr('ver_notas', { estudiantes: 'e02, e04' }).estudiantes.map((e) => e.id), ['e02', 'e04']);
});

test('errores claros: sin argumentos, estudiante o curso inexistentes', () => {
  assert.throws(() => ejecutar('ver_asistencia', {}), /estudiante.*estudiantes.*curso/);
  assert.throws(() => ejecutar('ver_asistencia', { estudiante: 'zzz' }), /No encontré/);
  assert.throws(() => ejecutar('ver_asistencia', { curso: 'quimica' }), /No existe el curso/);
  assert.throws(() => ejecutar('ver_asistencia', { estudiantes: ['e01', 'zzz'] }), /No encontré/);
});

test('las herramientas por curso o globales siguen igual', () => {
  assert.equal(correr('buscar_estudiantes', { curso: 'bio1' }).estudiantes.length, 24);
  assert.ok(correr('ver_programa', {}).programa);
  assert.ok(Array.isArray(correr('ver_aspirantes', {}).aspirantes));
});
