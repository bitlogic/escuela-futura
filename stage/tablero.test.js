import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearTablero, puedeMover, estadoDeTarea, eventosDeDecision, areaDe, contador } from './tablero.js';

const decision = { caso: 'Martina R.', objetivo: 'Riesgo antes del parcial', acciones: [{ texto: 'plan de pagos', quien: 'Secretaría', estado: 'si' }, { texto: 'práctica guiada', quien: 'docente', estado: 'si' }, { texto: 'llamada', quien: 'Bienestar', estado: 'yo' }, { texto: 'mail a la familia', quien: 'Bienestar', estado: 'no' }] };

test('una decisión crea la tarea del caso y una subtarea por acción, con responsables personas', () => {
  const evs = eventosDeDecision(decision, { nombrePersona: 'Alfredo' });
  assert.equal(evs[0].op, 'crear'); assert.equal(evs[0].titulo, 'Martina R.');
  assert.deepEqual(evs.slice(1).map((e) => [e.texto, e.responsable, e.estado]), [['Plan de pagos', 'Secretaría', 'pendiente'], ['Práctica guiada', 'Docente', 'pendiente'], ['Llamada', 'Alfredo', 'pendiente'], ['Mail a la familia', '', 'descartada']]);
  const tb = crearTablero(); evs.forEach((e) => tb.aplicar({ t: 1000, ...e }));
  assert.equal(tb.tareas.length, 1); assert.equal(tb.tareas[0].subtareas.length, 4); assert.equal(estadoDeTarea(tb.tareas[0]), 'pendiente');
  assert.equal(areaDe('bienestar'), 'Equipo de Bienestar'); assert.equal(areaDe('secretaría'), 'Secretaría');
  assert.deepEqual(eventosDeDecision(null), []);
  assert.equal(eventosDeDecision({ caso: 'Caso 1', objetivo: 'Qué carrera damos en 2027', acciones: [{ texto: 'x', estado: 'si' }] })[0].titulo, 'Qué carrera damos en 2027');
});

test('permisos: los agentes toman, entregan a revisión o devuelven a pendiente; las personas cierran', () => {
  assert.ok(puedeMover('advisor', 'pendiente', 'revision')); assert.ok(puedeMover('advisor', 'revision', 'pendiente'));
  assert.ok(!puedeMover('advisor', 'pendiente', 'lista')); assert.ok(puedeMover('advisor', 'pendiente', 'progreso')); assert.ok(!puedeMover('advisor', 'progreso', 'lista')); assert.ok(!puedeMover('advisor', 'lista', 'pendiente'));
  assert.ok(puedeMover('persona', 'pendiente', 'lista')); assert.ok(puedeMover('persona', 'lista', 'pendiente')); assert.ok(!puedeMover('persona', 'lista', 'lista')); assert.ok(!puedeMover('persona', 'lista', 'nada'));
  const tb = crearTablero(); const ids = contador();
  eventosDeDecision(decision, { ids }).forEach((e) => tb.aplicar(e));
  const s = tb.buscar('plan de pagos')[0];
  assert.ok(!tb.aplicar({ tipo: 'tarea', op: 'mover', id: s.id, estado: 'lista', quien: 'advisor' }));
  assert.ok(tb.aplicar({ tipo: 'tarea', op: 'mover', id: s.id, estado: 'progreso', quien: 'persona' }));
  assert.ok(tb.aplicar({ tipo: 'tarea', op: 'mover', id: s.id, estado: 'revision', quien: 'advisor', nota: 'la cuota de agosto figura paga' }));
  assert.equal(tb.subtarea(s.id).nota, 'la cuota de agosto figura paga'); assert.equal(estadoDeTarea(tb.tareas[0]), 'progreso');
  assert.ok(tb.aplicar({ tipo: 'tarea', op: 'mover', id: s.id, estado: 'lista', quien: 'persona' }));
  assert.ok(!tb.aplicar({ tipo: 'tarea', op: 'asignar', id: s.id, responsable: 'Nadie', quien: 'advisor' }));
  assert.ok(tb.aplicar({ tipo: 'tarea', op: 'asignar', id: s.id, responsable: 'Tesorería', quien: 'persona' })); assert.equal(tb.subtarea(s.id).responsable, 'Tesorería'); assert.equal(tb.subtarea(s.id).agente, null);
  const p = tb.buscar('práctica guiada')[0];
  assert.ok(tb.aplicar({ tipo: 'tarea', op: 'asignar', id: p.id, responsable: 'Tutor', agente: 'tutor', quien: 'persona' })); assert.equal(tb.subtarea(p.id).agente, 'tutor'); assert.equal(tb.asignadasA('tutor').length, 1);
  assert.ok(tb.aplicar({ tipo: 'tarea', op: 'mover', id: p.id, estado: 'progreso', quien: 'tutor' })); assert.ok(tb.aplicar({ tipo: 'tarea', op: 'mover', id: p.id, estado: 'revision', quien: 'tutor', nota: '10 cruzamientos monohíbridos' })); assert.equal(tb.asignadasA('tutor').length, 0);
  for (const x of tb.tareas[0].subtareas) if (x.estado === 'pendiente' || x.estado === 'revision') tb.aplicar({ tipo: 'tarea', op: 'mover', id: x.id, estado: 'lista', quien: 'persona' });   // la persona cierra lo pendiente y lo entregado
  assert.equal(estadoDeTarea(tb.tareas[0]), 'lista');   // la descartada no cuenta
  assert.ok(!tb.aplicar({ tipo: 'tarea', op: 'sub', id: 'x', tarea: 'no-existe', texto: 'y' }));
  assert.ok(!tb.aplicar({ tipo: 'dice' })); tb.reiniciar(); assert.equal(tb.tareas.length, 0);
});
