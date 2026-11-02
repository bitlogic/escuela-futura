import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearTableroServidor } from './tablero.mjs';

const busFalso = () => { const linea = [], mensajes = []; return { linea, mensajes, emitir: (ev) => { const e = { t: linea.length * 1000, ...ev }; linea.push(e); return e; }, mensajePersona: (texto) => { mensajes.push(texto); return { a: [] }; } }; };

test('la decisión crea tareas en el bus, un agente propone y revisa, la persona cierra', () => {
  const bus = busFalso(); const tb = crearTableroServidor({ bus, nombrePersona: 'Alfredo' });
  tb.desdeDecision({ caso: 'Martina R.', objetivo: 'Riesgo', acciones: [{ texto: 'plan de pagos', quien: 'Secretaría', estado: 'si' }, { texto: 'llamada', quien: 'Bienestar', estado: 'yo' }] });
  assert.equal(bus.linea.filter((e) => e.tipo === 'tarea').length, 3);
  assert.deepEqual(tb.estado().tareas[0].subtareas.map((s) => s.responsable), ['Secretaría', 'Alfredo']);
  assert.match(tb.ejecutar('advisor', 'proponer_tarea', { caso: 'Martina R.', accion: 'Pasar plan de pagos hoy', responsable: 'Secretaría' }), /Ya está en el Tablero: "plan de pagos"/i);   // la misma acción con otras palabras no se duplica
  assert.equal(tb.estado().tareas[0].subtareas.length, 2);
  assert.match(tb.ejecutar('advisor', 'proponer_tarea', { caso: 'Lucía P.', accion: 'responder el cambio de comisión', responsable: 'Secretaría' }), /Anotada en el Tablero/);
  assert.equal(tb.estado().tareas.length, 2); assert.equal(tb.estado().tareas[1].creadaPor, 'advisor');
  assert.throws(() => tb.ejecutar('advisor', 'revisar_tarea', { accion: 'no existe', estado: 'revision', nota: 'x' }), /No encuentro/);
  assert.match(tb.ejecutar('advisor', 'revisar_tarea', { accion: 'plan de pagos', estado: 'revision', nota: 'la cuota figura paga' }), /En revisión/);
  const s = tb.estado().tareas[0].subtareas[0]; assert.equal(s.estado, 'revision'); assert.equal(s.nota, 'la cuota figura paga');
  assert.throws(() => tb.operar({ op: 'mover', id: s.id, estado: 'lista' }, 'advisor'), /lo hace una persona/);
  tb.operar({ op: 'mover', id: s.id, estado: 'lista' }); assert.equal(tb.estado().tareas[0].subtareas[0].estado, 'lista');
  assert.throws(() => tb.operar({ op: 'mover', id: s.id, estado: 'lista' }), /Ya está/);
  const e = tb.operar({ op: 'crear', titulo: 'Mesas de noviembre' }); tb.operar({ op: 'sub', tarea: e.id, texto: 'Publicar fechas', responsable: 'bienestar' });
  assert.equal(tb.estado().tareas[2].subtareas[0].responsable, 'Equipo de Bienestar');
  tb.reiniciar(); assert.equal(tb.estado().tareas.length, 0);
});

test('una persona asigna una acción a un agente: pasa a En progreso, el agente se entera por el canal y la entrega En revisión', () => {
  const bus = busFalso(); const tb = crearTableroServidor({ bus, nombrePersona: 'Alfredo', agentes: [{ id: 'tutor', nombre: 'Tutor' }] });
  tb.desdeDecision({ caso: 'Martina R.', acciones: [{ texto: 'práctica guiada de cruzamientos', quien: 'docente', estado: 'si' }, { texto: 'plan de pagos', quien: 'Secretaría', estado: 'si' }] });
  const [practica, plan] = tb.estado().tareas[0].subtareas;
  assert.equal(practica.responsable, 'Docente'); assert.equal(practica.agente, null);   // de la decisión, los responsables son personas
  assert.throws(() => tb.ejecutar('tutor', 'entregar_tarea', { accion: 'práctica', resultado: 'x' }), /No tenés acciones asignadas/);
  assert.throws(() => tb.operar({ op: 'asignar', id: practica.id, agente: 'pepe' }), /No existe el agente/);
  tb.operar({ op: 'asignar', id: practica.id, agente: 'tutor' });
  assert.equal(practica.responsable, 'Tutor'); assert.equal(practica.agente, 'tutor'); assert.equal(practica.estado, 'progreso');
  assert.equal(bus.mensajes.length, 1); assert.match(bus.mensajes[0], /^@Tutor te asigné en el Tablero: práctica guiada de cruzamientos \(Martina R\.\)/);
  assert.throws(() => tb.ejecutar('tutor', 'entregar_tarea', { accion: 'práctica', resultado: '' }), /Falta el resultado/);
  assert.match(tb.ejecutar('tutor', 'entregar_tarea', { accion: 'práctica guiada', resultado: '10 cruzamientos monohíbridos y dihíbridos con el docente, jueves 31/10.' }), /En revisión/);
  assert.equal(practica.estado, 'revision'); assert.match(practica.nota, /monohíbridos/); assert.equal(practica.movidaPor, 'tutor');
  assert.throws(() => tb.operar({ op: 'mover', id: practica.id, estado: 'lista' }, 'tutor'), /lo hace una persona/);
  tb.operar({ op: 'mover', id: practica.id, estado: 'lista' }); assert.equal(practica.estado, 'lista');
  // Asignar a un área (no agente) no encarga a nadie; revisar_tarea sobre una propia es una entrega
  tb.operar({ op: 'asignar', id: plan.id, responsable: 'Secretaría' }); assert.equal(bus.mensajes.length, 1); assert.equal(plan.estado, 'pendiente');
  tb.operar({ op: 'asignar', id: plan.id, agente: 'tutor' }); assert.equal(bus.mensajes.length, 2);
  assert.match(tb.ejecutar('tutor', 'revisar_tarea', { accion: 'plan de pagos', estado: 'revision', nota: 'listo' }), /Entregada/);
});
