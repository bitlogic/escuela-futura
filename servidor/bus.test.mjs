// Tests del bus de menciones con turnos guionados y reloj manual. Correr: node --test servidor/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBus } from './bus.mjs';
import { crearResolutor } from './menciones.mjs';

const AGENTES = [['coordinacion', 'Coordinación'], ['tutor', 'Tutor'], ['advisor', 'Advisor'], ['bienestar', 'Bienestar']].map(([id, nombre]) => ({ id, nombre }));
const PERSONA = { id: 'persona:direccion', nombre: 'Dirección', alias: ['direccion'] };

// Reloj y temporizadores manuales
function reloj() {
  let t = 1_000_000; const timers = [];
  return {
    ahora: () => t,
    programar: (ms, fn) => { const h = { en: t + ms, fn }; timers.push(h); return h; },
    cancelar: (h) => { const i = timers.indexOf(h); if (i >= 0) timers.splice(i, 1); },
    async avanzar(ms) {   // corre los temporizadores vencidos en orden y deja correr las promesas
      const fin = t + ms;
      while (true) {
        const listos = timers.filter((x) => x.en <= fin).sort((a, b) => a.en - b.en);
        if (!listos.length) break;
        const h = listos[0]; timers.splice(timers.indexOf(h), 1); t = h.en; h.fn(); await respirar();
      }
      t = fin; await respirar();
    },
  };
}
const respirar = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };

// Turnos guionados: por agente, una cola de funciones (ctx, lote) => Promise. Un turno "libre" (sin guion) no hace nada.
function armar({ guion = {}, limites, entregaEnTurno } = {}) {
  const r = reloj(); const eventos = []; const turnos = [];
  const abiertos = new Map();   // turnos que esperan que el test los termine: id → resolver
  const correrTurno = async (id, lote, ctx) => {
    turnos.push({ id, lote, ctx });
    const g = (guion[id] || []).shift();
    if (!g) return;
    if (g === 'abierto') return new Promise((ok) => abiertos.set(id, ok));
    await g(ctx, lote);
  };
  const bus = crearBus({ agentes: AGENTES, persona: PERSONA, resolver: crearResolutor({ agentes: AGENTES, persona: PERSONA }), correrTurno, programar: r.programar, cancelar: r.cancelar, ahora: r.ahora, limites, entregaEnTurno });
  bus.suscribir((f) => eventos.push(...f));
  const cerrar = async (id) => { abiertos.get(id)(); abiertos.delete(id); await respirar(); };
  const tipos = (id) => eventos.filter((e) => e.quien === id).map((e) => e.tipo);
  return { bus, r, eventos, turnos, cerrar, tipos };
}

test('fan-out: una delegación triple despierta a tres y deja pendientes', async () => {
  const guion = { coordinacion: [async (ctx) => { ctx.enviar('@Bienestar asistencia.'); ctx.enviar('@Tutor notas.'); ctx.enviar('@Advisor pagos.'); }] };
  const { bus, r, eventos, turnos } = armar({ guion });
  bus.mensajePersona('@Coordinación quiénes están en riesgo'); await respirar();
  assert.equal(eventos[0].tipo, 'persona'); assert.deepEqual(eventos[0].a, ['coordinacion']);
  await r.avanzar(1500);
  const dice = eventos.filter((e) => e.tipo === 'dice');
  assert.deepEqual(dice.map((e) => e.a[0]), ['bienestar', 'tutor', 'advisor']);
  assert.deepEqual(bus.estado().agentes.find((a) => a.id === 'coordinacion').pendientes, ['bienestar', 'tutor', 'advisor']);
  await r.avanzar(1500);
  assert.deepEqual(turnos.map((t) => t.id).sort(), ['advisor', 'bienestar', 'coordinacion', 'tutor']);
  assert.equal(turnos[1].lote.mensajes[0].texto, '@Bienestar asistencia.');
});

test('espera a que callen: Coordinación recibe las tres respuestas en un solo turno', async () => {
  const guion = {
    coordinacion: [async (ctx) => { ctx.enviar('@Bienestar a.'); ctx.enviar('@Tutor b.'); ctx.enviar('@Advisor c.'); }],
    bienestar: [async (ctx) => ctx.enviar('@Coordinación listo bienestar')],
    tutor: [async (ctx) => ctx.enviar('@Coordinación listo tutor')],
    advisor: ['abierto'],
  };
  const { bus, r, turnos, cerrar, tipos } = armar({ guion });
  bus.mensajePersona('objetivo');
  await r.avanzar(3000);      // Coordinación delegó; Bienestar y Tutor contestaron; Advisor sigue corriendo
  await r.avanzar(5000);
  assert.equal(tipos('coordinacion').filter((t) => t === 'inicio').length, 1, 'no arranca mientras Advisor corre');
  // Advisor contesta y termina
  turnos.find((t) => t.id === 'advisor').ctx.enviar('@Coordinación listo advisor');
  await cerrar('advisor');
  await r.avanzar(1500);
  assert.equal(tipos('coordinacion').filter((t) => t === 'inicio').length, 2);
  const lote = turnos.filter((t) => t.id === 'coordinacion')[1].lote;
  assert.deepEqual(lote.mensajes.map((m) => m.de), ['bienestar', 'tutor', 'advisor']);
  assert.deepEqual(lote.faltan, []); assert.deepEqual(lote.terminaronSin, []);
});

test('fin sin respuesta y retención vencida avisan quién falta', async () => {
  const guion = {
    coordinacion: [async (ctx) => { ctx.enviar('@Bienestar a.'); ctx.enviar('@Advisor c.'); }],
    bienestar: [async (ctx) => ctx.enviar('@Coordinación listo')],
    advisor: [async () => {}],   // termina sin escribirle a nadie
  };
  const { bus, r, turnos } = armar({ guion });
  bus.mensajePersona('objetivo'); await r.avanzar(6000);
  const lote = turnos.filter((t) => t.id === 'coordinacion')[1].lote;
  assert.deepEqual(lote.terminaronSin, ['Advisor']);
  assert.deepEqual(lote.mensajes.map((m) => m.de), ['bienestar']);

  // Retención vencida: Advisor nunca termina
  const g2 = { coordinacion: [async (ctx) => { ctx.enviar('@Bienestar a.'); ctx.enviar('@Advisor c.'); }], bienestar: [async (ctx) => ctx.enviar('@Coordinación listo')], advisor: ['abierto'] };
  const b2 = armar({ guion: g2 });
  b2.bus.mensajePersona('objetivo'); await b2.r.avanzar(3000);
  await b2.r.avanzar(50000);
  const l2 = b2.turnos.filter((t) => t.id === 'coordinacion')[1].lote;
  assert.deepEqual(l2.faltan, ['Advisor']);
});

test('mensaje en medio del turno: se entrega con los tool_result y no hay turnos duplicados', async () => {
  const guion = { bienestar: ['abierto'], advisor: [async (ctx) => ctx.enviar('@Bienestar ojo con Martina')] };
  const { bus, r, turnos, cerrar, tipos } = armar({ guion });
  bus.mensajePersona('@Bienestar @Advisor revisen'); await r.avanzar(2000);
  await r.avanzar(2000);
  const bctx = turnos.find((t) => t.id === 'bienestar').ctx;
  const nuevos = bctx.nuevos();
  assert.equal(nuevos.length, 1); assert.match(nuevos[0].texto, /Martina/);
  await cerrar('bienestar'); await r.avanzar(3000);
  assert.deepEqual(tipos('bienestar'), ['inicio', 'fin'], 'lo entregado en el turno no arranca otro');
  // Sin entrega en turno, el mensaje espera al fin y arranca otro turno
  const b2 = armar({ guion: { bienestar: ['abierto'], advisor: [async (ctx) => ctx.enviar('@Bienestar ojo')] }, entregaEnTurno: false });
  b2.bus.mensajePersona('@Bienestar @Advisor revisen'); await b2.r.avanzar(4000);
  assert.deepEqual(b2.turnos.find((t) => t.id === 'bienestar').ctx.nuevos(), []);
  await b2.cerrar('bienestar'); await b2.r.avanzar(3000);
  assert.deepEqual(b2.tipos('bienestar'), ['inicio', 'fin', 'inicio', 'fin']);
});

test('menciones: por defecto responde a quien le escribió; inválida es error y no publica', async () => {
  const guion = { tutor: [async (ctx) => { assert.throws(() => ctx.enviar('@Pepe hola'), /No reconozco @Pepe/); assert.match(ctx.enviar('sin mención'), /sin @mención/); }] };
  const { bus, r, eventos } = armar({ guion });
  bus.mensajePersona('@Tutor dale'); await r.avanzar(2000);
  const dice = eventos.filter((e) => e.tipo === 'dice');
  assert.equal(dice.length, 1); assert.deepEqual(dice[0].a, ['persona:direccion']);
});

test('ping-pong: pasado el salto máximo se publica pero no se despierta; una persona sí despierta', async () => {
  const eco = async (ctx) => ctx.enviar('dale');   // sin mención: le contesta al que le escribió
  const guion = { advisor: [async (ctx) => ctx.enviar('@Bienestar hola'), eco, eco, eco], bienestar: [eco, eco, eco, eco] };
  const { bus, r, eventos, turnos } = armar({ guion, limites: { saltoMax: 3, turnos: { otros: 10 } } });
  bus.mensajePersona('@Advisor hablá con Bienestar'); await r.avanzar(60000);
  const dice = eventos.filter((e) => e.tipo === 'dice');
  const inicios = eventos.filter((e) => e.tipo === 'inicio');
  // persona 0 → advisor 1 → bienestar 2 → advisor 3 → bienestar 4 (se publica, ya no despierta)
  assert.equal(inicios.length, 4, `cadena cortada: ${inicios.length} turnos`);
  assert.equal(dice.length, 4, 'el último mensaje se publica aunque no despierte');
  const ultimo = turnos[turnos.length - 1];
  assert.match(ultimo.ctx.enviar('otra'), /no va a responder/);
  const antes = inicios.length;
  bus.mensajePersona('@Advisor seguí'); await r.avanzar(3000);
  assert.ok(eventos.filter((e) => e.tipo === 'inicio').length > antes, 'la persona siempre despierta');
});

test('reiniciar en medio de un turno descarta su resultado', async () => {
  const guion = { tutor: ['abierto'] };
  const { bus, r, eventos, turnos, cerrar } = armar({ guion });
  bus.mensajePersona('@Tutor dale'); await r.avanzar(2000);
  bus.reiniciar();
  assert.equal(turnos[0].ctx.enviar('tarde'), 'La corrida se reinició.');
  await cerrar('tutor');
  assert.deepEqual(bus.snapshot().eventos, []);
  assert.equal(eventos.filter((e) => e.tipo === 'fin').length, 0);
});
