import { test } from 'node:test';
import assert from 'node:assert/strict';
import { argHerramienta, textoHerramienta, completarHerramienta } from './herramientas.js';

test('el globo dice de quién es la consulta: uno, dos, muchos o el curso', () => {
  assert.equal(textoHerramienta('ver_asistencia', { estudiante: 'Martina' }), 'Reviso la asistencia de Martina');
  assert.equal(textoHerramienta('ver_notas', { estudiantes: ['e01', 'e03'] }), 'Reviso las notas de e01 y e03');
  assert.equal(textoHerramienta('ver_asistencia', { estudiantes: ['e01', 'e02', 'e03'] }), 'Reviso la asistencia de 3 estudiantes');
  assert.equal(textoHerramienta('ver_asistencia', { estudiantes: 'e01, e02, e03, e04' }), 'Reviso la asistencia de 4 estudiantes');
  assert.equal(textoHerramienta('ver_situacion_administrativa', { curso: 'Biología 1' }), 'Reviso inscripciones y pagos de Biología 1');
  assert.equal(textoHerramienta('ver_aspirantes', {}), 'Reviso los aspirantes');
  assert.equal(textoHerramienta('ver_oferta_academica', undefined), 'Reviso la oferta académica');
  assert.equal(argHerramienta({ estudiantes: [] , estudiante: 'e05' }), 'e05');
});

test('completarHerramienta sigue entendiendo las corridas viejas con `arg`', () => {
  const ev = completarHerramienta({ tipo: 'herramienta', herramienta: 'ver_notas', arg: 'e02' });
  assert.equal(ev.texto, 'Reviso las notas de e02');
  assert.equal(ev.lugar, 'aula-bio1');
});

test('el curso se nombra por su nombre aunque el agente o la corrida grabada traigan el id', () => {
  assert.equal(textoHerramienta('ver_notas', { curso: 'bio1' }), 'Reviso las notas de Biología 1');
  assert.equal(completarHerramienta({ tipo: 'herramienta', herramienta: 'ver_asistencia', texto: 'Reviso la asistencia de bio1' }).texto, 'Reviso la asistencia de Biología 1');
  assert.equal(completarHerramienta({ tipo: 'herramienta', herramienta: 'ver_asistencia', texto: 'Reviso la asistencia de Martina' }).texto, 'Reviso la asistencia de Martina');
});
