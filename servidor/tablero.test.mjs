import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearTableroServidor } from './tablero.mjs';

const busFalso = () => { const linea = []; return { linea, emitir: (ev) => { const e = { t: linea.length * 1000, ...ev }; linea.push(e); return e; } }; };

test('la decisión crea tareas en el bus, un agente propone y revisa, la persona cierra', () => {
  const bus = busFalso(); const tb = crearTableroServidor({ bus, nombrePersona: 'Alfredo' });
  tb.desdeDecision({ caso: 'Martina R.', objetivo: 'Riesgo', acciones: [{ texto: 'plan de pagos', quien: 'Secretaría', estado: 'si' }, { texto: 'llamada', quien: 'Bienestar', estado: 'yo' }] });
  assert.equal(bus.linea.filter((e) => e.tipo === 'tarea').length, 3);
  assert.deepEqual(tb.estado().tareas[0].subtareas.map((s) => s.responsable), ['Secretaría', 'Alfredo']);
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
