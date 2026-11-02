import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSeguimiento, actividadDe, palabraDe, planDe, tipoDeDecision } from './seguimiento.js';
import { esPropuesta, propuesta } from './chat.js';

const ids = { coordinacion: 'coordinacion', bienestar: 'bienestar', tutor: 'tutor', advisor: 'advisor' };
const nuevo = () => crearSeguimiento({ agenteDe: (n) => ids[n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')] || null, esPropuesta, accionesDe: (t) => propuesta(t).casos.flatMap((c) => c.acciones || []), nombrePersona: 'Alfredo' });
const P = 'persona:direccion';
const nombres = { coordinacion: 'Coordinación', bienestar: 'Bienestar', tutor: 'Tutor', advisor: 'Advisor' };
const act = (s, ahora = 0) => actividadDe(s.actual, { nombreDe: (id) => nombres[id] || id, ahora });

test('un objetivo deja un registro de actividad y, al cerrarse, el ciclo de vida con tiempos', () => {
  const s = nuevo();
  s.aplicar({ t: 0, tipo: 'persona', texto: 'Antes del parcial, identificá quién está en riesgo.' });
  assert.equal(s.actual.estado, 'enviado'); assert.ok(s.actual.objetivo);
  s.aplicar({ t: 1500, tipo: 'inicio', quien: 'coordinacion' });
  let a = act(s, 1600); assert.equal(a.items[0].texto, 'Objetivo recibido'); assert.match(a.items[1].texto, /^Coordinación leyendo el pedido…$/); assert.equal(a.items[1].estado, 'on');
  a = act(s, 1500 + 1500); assert.match(a.items[1].texto, /mirando la lista/);
  s.aplicar({ t: 2000, tipo: 'herramienta', quien: 'coordinacion', texto: 'Busco la lista del curso de Biología 1' });
  assert.equal(act(s, 2500).items[1].texto, 'Coordinación · Busco la lista del curso de Biología 1');
  s.aplicar({ t: 4000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: 'Dale. Reparto y vuelvo con una propuesta.' });
  assert.equal(s.actual.estado, 'enviado');
  s.aplicar({ t: 7000, tipo: 'dice', quien: 'coordinacion', a: ['bienestar'], texto: '@Bienestar asistencia' });
  s.aplicar({ t: 7010, tipo: 'dice', quien: 'coordinacion', a: ['tutor'], texto: '@Tutor notas' });
  s.aplicar({ t: 7500, tipo: 'fin', quien: 'coordinacion' });
  a = act(s, 8000); assert.equal(a.items[1].texto, 'Coordinación repartió el trabajo a Bienestar y Tutor'); assert.equal(a.items[1].t, '0:07'); assert.equal(a.items.length, 2);
  s.aplicar({ t: 9000, tipo: 'inicio', quien: 'bienestar' }); s.aplicar({ t: 9000, tipo: 'inicio', quien: 'tutor' });
  assert.equal(act(s, 9100).badge.texto, 'Analizando');
  s.aplicar({ t: 9000, tipo: 'inicio', quien: 'advisor' }); assert.deepEqual(act(s, 9100).trabajando, ['Bienestar', 'Tutor', 'Advisor']); s.aplicar({ t: 9001, tipo: 'fin', quien: 'advisor' });
  s.aplicar({ t: 9000, tipo: 'inicio', quien: 'coordinacion' }); assert.equal(act(s, 9100).badge.texto, 'Analizando'); s.aplicar({ t: 9001, tipo: 'fin', quien: 'coordinacion' });   // Coordinación espera: no cuenta
  s.aplicar({ t: 30000, tipo: 'dice', quien: 'tutor', a: ['bienestar'], texto: '@Bienestar dejó el tutor' });
  s.aplicar({ t: 31000, tipo: 'dice', quien: 'tutor', a: ['coordinacion'], texto: '@Coordinación Martina: 3 de 10' }); s.aplicar({ t: 31500, tipo: 'fin', quien: 'tutor' });
  s.aplicar({ t: 36000, tipo: 'dice', quien: 'bienestar', a: ['coordinacion'], texto: 'Martina: 2 de 10' }); s.aplicar({ t: 36500, tipo: 'fin', quien: 'bienestar' });
  a = act(s, 37000); assert.deepEqual(a.items.slice(2).map((x) => x.texto), ['Tutor le avisó algo a Bienestar sin que se lo pidieran', 'Tutor respondió', 'Bienestar respondió']);
  s.aplicar({ t: 38000, tipo: 'inicio', quien: 'coordinacion' });
  assert.equal(act(s, 38500).badge.texto, 'Preparando propuesta');
  s.aplicar({ t: 80000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: '@Dirección Propuesta para decidir: x\n1. Martina R., riesgo alto: y.' }); s.aplicar({ t: 80500, tipo: 'fin', quien: 'coordinacion' });
  a = act(s, 81000); assert.equal(s.actual.estado, 'propuesta'); assert.equal(a.badge.texto, 'Pendiente de tu revisión'); assert.equal(a.preparacion, '1:20'); assert.equal(a.items[a.items.length - 1].estado, 'espera');
  s.aplicar({ t: 110000, tipo: 'persona', texto: 'Plan de pagos sí. La llamada la hago yo.' });
  assert.equal(s.actual.estado, 'decidido'); assert.equal(s.pedidos.length, 1); assert.equal(s.actual.decisionTipo, 'ajustes'); assert.equal(act(s, 110500).badge.texto, 'Aprobada con ajustes');
  s.aplicar({ t: 111000, tipo: 'inicio', quien: 'coordinacion' });
  s.aplicar({ t: 118000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: '@Dirección Martina: plan de pagos, Secretaría.' }); s.aplicar({ t: 118500, tipo: 'fin', quien: 'coordinacion' });
  a = act(s, 119000);
  assert.equal(s.actual.estado, 'cerrado'); assert.equal(a.badge.texto, 'Aprobada con ajustes'); assert.equal(a.total, '1:58');
  assert.deepEqual(a.items.map((x) => x.t), ['0:00', '0:07', '1:20', '1:50', '1:58']);
  assert.equal(a.items[1].detalle, '2 agentes, 2 respondieron, 1 aviso entre ellos');
  assert.equal(a.items[3].detalle, 'Plan de pagos sí. La llamada la hago yo.');
  assert.match(a.siguiente, /otro objetivo/);
});

test('una pregunta a un agente es un pedido aparte y queda respondida', () => {
  const s = nuevo();
  s.aplicar({ t: 0, tipo: 'persona', texto: 'objetivo' });
  s.aplicar({ t: 1000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: '@Dirección Propuesta para decidir: x' });
  s.aplicar({ t: 2000, tipo: 'persona', texto: 'ok' });
  s.aplicar({ t: 3000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: 'cierre' });
  s.aplicar({ t: 10000, tipo: 'persona', texto: '@Advisor eximile la deuda a Martina.' });
  assert.equal(s.pedidos.length, 2); assert.ok(!s.actual.objetivo); assert.equal(s.objetivoCumplido.estado, 'cerrado');
  s.aplicar({ t: 11000, tipo: 'inicio', quien: 'advisor' });
  assert.equal(act(s, 11100).badge.texto, 'Analizando'); assert.match(act(s, 11100).items[1].texto, /^Advisor revisando cuotas…$/);
  s.aplicar({ t: 15000, tipo: 'dice', quien: 'advisor', a: [P], texto: 'Eso lo decide una persona.' }); s.aplicar({ t: 15100, tipo: 'fin', quien: 'advisor' });
  const a = act(s, 16000);
  assert.equal(s.actual.estado, 'cerrado'); assert.equal(a.badge.texto, 'Respondido en 0:05'); assert.equal(a.items[1].texto, 'Advisor respondió');
});

test('si Coordinación contesta sin repartir, el objetivo se cierra con esa respuesta; palabraDe gira', () => {
  const s = nuevo();
  s.aplicar({ t: 0, tipo: 'persona', texto: '¿qué datos usaste?' });
  s.aplicar({ t: 100, tipo: 'inicio', quien: 'coordinacion' });
  s.aplicar({ t: 3000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: 'Los de Advisor y Bienestar.' });
  s.aplicar({ t: 3100, tipo: 'fin', quien: 'coordinacion' });
  assert.equal(s.actual.estado, 'cerrado'); assert.equal(s.actual.cierre, 'Los de Advisor y Bienestar.');
  assert.equal(palabraDe('tutor', 0, 0), 'mirando las notas'); assert.equal(palabraDe('tutor', 0, 1400), 'repasando las consultas'); assert.equal(palabraDe('x', 0, 0), 'pensando');
  s.reiniciar(); assert.equal(s.actual, null);
});

const PROPUESTA = '@Dirección Propuesta para decidir: Martina\n1. Martina R., riesgo alto: bloqueada (Advisor).\n   Acciones: plan de pagos (Secretaría) · práctica guiada de cruzamientos (docente) · llamada (Bienestar)\nPendiente: por qué. ¿Qué aprobás?';

test('consultar no es decidir: una pregunta durante la propuesta la deja esperando, y la respuesta no cierra nada', () => {
  const s = nuevo();
  s.aplicar({ t: 0, tipo: 'persona', texto: 'objetivo' });
  s.aplicar({ t: 1000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: PROPUESTA });
  s.aplicar({ t: 2000, tipo: 'persona', texto: '@Bienestar ¿por qué recomendás la llamada?' });
  assert.equal(s.actual.estado, 'propuesta'); assert.equal(s.pedidos.length, 1);
  assert.equal(act(s).badge.texto, 'Pendiente de tu revisión'); assert.equal(act(s).items.at(-2).texto, 'Le preguntaste a Bienestar');
  s.aplicar({ t: 3000, tipo: 'inicio', quien: 'bienestar' });
  s.aplicar({ t: 4000, tipo: 'dice', quien: 'bienestar', a: [P], texto: 'Porque no viene desde el 18/8.' }); s.aplicar({ t: 4100, tipo: 'fin', quien: 'bienestar' });
  assert.equal(s.actual.estado, 'propuesta'); assert.equal(act(s).items.at(-2).texto, 'Bienestar respondió');
  s.aplicar({ t: 5000, tipo: 'persona', texto: '¿y si la llamo yo?' });   // sin @mención pero pregunta: también es consulta
  assert.equal(s.actual.estado, 'propuesta');
  s.aplicar({ t: 6000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: 'Mejor.' });
  assert.equal(s.actual.estado, 'propuesta', 'la respuesta de Coordinación a una consulta tampoco cierra');
  s.aplicar({ t: 7000, tipo: 'persona', texto: 'Plan de pagos y práctica guiada, sí. La llamada la hago yo.' });
  assert.equal(s.actual.estado, 'decidido');
  assert.deepEqual(s.actual.plan, [
    { accion: 'plan de pagos', responsable: 'Secretaría', estado: 'pendiente' },
    { accion: 'práctica guiada de cruzamientos', responsable: 'docente', estado: 'pendiente' },
    { accion: 'llamada', responsable: 'Alfredo', estado: 'pendiente' },
  ]);
  s.aplicar({ t: 8000, tipo: 'dice', quien: 'advisor', a: [P], texto: 'Eso lo firma una persona.' });
  assert.equal(s.actual.estado, 'decidido', 'otro agente hablándole a la persona no cierra el objetivo');
  s.aplicar({ t: 9000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: 'Martina: plan de pagos, Secretaría.' });
  assert.equal(s.actual.estado, 'cerrado');
  const a = act(s); assert.deepEqual(a.plan.map((x) => x.estado), ['pendiente', 'pendiente', 'pendiente']); assert.match(a.siguiente, /Quedan 3 acciones/);
  s.marcar(s.actual, 0); assert.equal(s.actual.plan[0].estado, 'hecha'); assert.match(act(s).siguiente, /Quedan 2 acciones/);
  s.marcar(s.actual, 0, false); assert.equal(s.actual.plan[0].estado, 'pendiente');
});

test('la decisión estructurada de la tarjeta manda sobre el texto; sin ella, el plan se deduce del texto', () => {
  const s = nuevo();
  s.aplicar({ t: 0, tipo: 'persona', texto: 'objetivo' });
  s.aplicar({ t: 1000, tipo: 'dice', quien: 'coordinacion', a: [P], texto: PROPUESTA });
  s.aplicar({ t: 2000, tipo: 'persona', texto: 'Plan de pagos, sí. Llamada: la hago yo. Práctica guiada, no.', decision: { acciones: [{ texto: 'plan de pagos', quien: 'Secretaría', estado: 'si' }, { texto: 'práctica guiada de cruzamientos', quien: 'docente', estado: 'no' }, { texto: 'llamada', quien: 'Bienestar', estado: 'yo' }] } });
  assert.deepEqual(s.actual.plan.map((x) => [x.responsable, x.estado]), [['Secretaría', 'pendiente'], ['', 'descartada'], ['Alfredo', 'pendiente']]);
  s.marcar(s.actual, 1); assert.equal(s.actual.plan[1].estado, 'descartada', 'una descartada no se marca');
  const acc = propuesta(PROPUESTA).casos[0].acciones;
  assert.deepEqual(planDe(null, acc, 'Aprobado todo.', 'Alfredo').map((x) => x.estado), ['pendiente', 'pendiente', 'pendiente']);
  assert.deepEqual(planDe(null, acc, 'Plan de pagos sí. Práctica guiada no; a Martina la llamo yo.', 'Alfredo').map((x) => x.responsable + '/' + x.estado), ['Secretaría/pendiente', '/descartada', 'Alfredo/pendiente']);
  assert.equal(planDe(null, [], 'x'), null);
});

test('tipoDeDecision: aprobada, con ajustes o descartada', () => {
  assert.equal(tipoDeDecision({ acciones: [{ estado: 'si' }, { estado: 'si' }] }), 'aprobada');
  assert.equal(tipoDeDecision({ acciones: [{ estado: 'si' }, { estado: 'yo' }] }), 'ajustes');
  assert.equal(tipoDeDecision({ acciones: [{ estado: 'no' }] }), 'descartada');
  assert.equal(tipoDeDecision(null, [{ estado: 'pendiente' }], 'Todo sí.'), 'aprobada');
  assert.equal(tipoDeDecision(null, [{ estado: 'pendiente' }], 'Plan de pagos sí. La llamada la hago yo.'), 'ajustes');
  assert.equal(tipoDeDecision(null, [{ estado: 'descartada' }], 'No.'), 'descartada');
});
