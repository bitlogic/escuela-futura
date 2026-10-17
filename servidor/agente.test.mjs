// Tests del corredor de turnos con un cliente falso guionado. Correr: node --test servidor/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCorredor, formatearLote } from './agente.mjs';

const AGENTES = [{ id: 'bienestar', nombre: 'Bienestar', prompt: 'Sos Bienestar.', herramientas: ['ver_asistencia'] }];
const HERRAMIENTAS = [{ name: 'ver_asistencia', description: 'asistencia', inputSchema: { type: 'object', properties: { estudiante: { type: 'string' } }, required: ['estudiante'] } }];
const texto = (t) => ({ type: 'text', text: t });
const uso = (id, name, input) => ({ type: 'tool_use', id, name, input });

function clienteFalso(respuestas) {
  const pedidos = [];
  return { pedidos, beta: { messages: { create: async (req) => { pedidos.push(req); const r = respuestas.shift(); if (!r) throw new Error('sin respuesta guionada'); return r; } } } };
}
function ctxFalso({ esperaAAlguien = false, lePidieron = true } = {}) {
  const enviados = [], eventos = [], cola = [];
  return { enviados, eventos, cola, vigente: () => true, enviar: (t) => { enviados.push(t); return 'Enviado a Coordinación.'; }, nuevos: () => cola.splice(0), esperaAAlguien: () => esperaAAlguien, lePidieron: () => lePidieron, emitir: (e) => eventos.push(e) };
}
const lote = { mensajes: [{ hora: '10:00', nombre: 'Coordinación', texto: '@Bienestar asistencia de Martina' }], faltan: [], terminaronSin: [] };
const corredor = (cliente) => crearCorredor({ cliente, modelo: 'm', instrucciones: 'Equipo.', agentes: AGENTES, herramientas: HERRAMIENTAS, ejecutar: (n, a) => `${n}(${a.estudiante})`, fallbacks: false });

// Invariante de forma de la API: user primero, cada tool_use con su tool_result en el mensaje siguiente, sin dos assistant seguidos
function formaValida(mensajes) {
  assert.equal(mensajes[0].role, 'user');
  for (let i = 0; i < mensajes.length; i++) {
    const m = mensajes[i];
    assert.ok(m.content && m.content.length !== 0, 'sin contenido vacío');
    if (m.role === 'assistant') {
      assert.notEqual(mensajes[i - 1].role, 'assistant');
      const usos = m.content.filter((b) => b.type === 'tool_use').map((b) => b.id);
      if (usos.length) { const res = mensajes[i + 1].content.filter((b) => b.type === 'tool_result').map((b) => b.tool_use_id); assert.deepEqual(res, usos); }
    }
  }
}

test('turno con herramienta y mensaje: eventos herramienta, resultados en orden y conversación bien formada', async () => {
  const cliente = clienteFalso([
    { stop_reason: 'tool_use', content: [texto('Reviso.'), uso('t1', 'ver_asistencia', { estudiante: 'Martina' })] },
    { stop_reason: 'tool_use', content: [uso('t2', 'enviar_mensaje', { texto: '@Coordinación Martina faltó 6 de 9.' })] },
    { stop_reason: 'end_turn', content: [texto('Listo.')] },
  ]);
  const c = corredor(cliente); const ctx = ctxFalso();
  await c.correrTurno('bienestar', lote, ctx);
  assert.deepEqual(ctx.eventos.map((e) => e.tipo), ['herramienta']);
  assert.equal(ctx.eventos[0].lugar, 'aula-bio1'); assert.match(ctx.eventos[0].texto, /de Martina/);
  assert.deepEqual(ctx.enviados, ['@Coordinación Martina faltó 6 de 9.']);
  const conv = c.conversacion('bienestar'); formaValida(conv);
  assert.equal(conv[2].content[0].content, 'ver_asistencia(Martina)');
  assert.equal(cliente.pedidos[0].tools.map((t) => t.name).join(','), 'ver_asistencia,enviar_mensaje');
  assert.match(cliente.pedidos[0].system[0].text, /^Equipo\.\n\n---\n\nSos Bienestar\./);
  assert.equal(cliente.pedidos[0].messages[0].content, formatearLote(lote));
});

test('mensajes que llegan en medio del turno van después de los tool_result', async () => {
  const cliente = clienteFalso([
    { stop_reason: 'tool_use', content: [uso('t1', 'ver_asistencia', { estudiante: 'Martina' })] },
    { stop_reason: 'tool_use', content: [uso('t2', 'enviar_mensaje', { texto: '@Coordinación ok' })] },
    { stop_reason: 'end_turn', content: [] },
  ]);
  const c = corredor(cliente); const ctx = ctxFalso();
  ctx.cola.push({ hora: '10:01', nombre: 'Advisor', texto: '@Bienestar ojo con Martina' });
  await c.correrTurno('bienestar', lote, ctx);
  const conv = c.conversacion('bienestar'); formaValida(conv);
  assert.equal(conv[2].content[1].type, 'text'); assert.match(conv[2].content[1].text, /mientras trabajabas:\n\[10:01\] Advisor/);
});

test('texto solo: un empujón; si manda, es dice; si no, piensa. Si espera a alguien, piensa directo', async () => {
  const c1 = corredor(clienteFalso([
    { stop_reason: 'end_turn', content: [texto('Martina faltó 6 de 9.')] },
    { stop_reason: 'tool_use', content: [uso('t1', 'enviar_mensaje', { texto: '@Coordinación Martina faltó 6 de 9.' })] },
    { stop_reason: 'end_turn', content: [] },
  ]));
  const ctx1 = ctxFalso(); await c1.correrTurno('bienestar', lote, ctx1);
  assert.equal(ctx1.enviados.length, 1); assert.deepEqual(ctx1.eventos, []);
  assert.match(c1.conversacion('bienestar')[2].content, /No mandaste ningún mensaje/);

  const c2 = corredor(clienteFalso([{ stop_reason: 'end_turn', content: [texto('Nada que decir.')] }, { stop_reason: 'end_turn', content: [texto('Sigo sin nada.')] }]));
  const ctx2 = ctxFalso(); await c2.correrTurno('bienestar', lote, ctx2);
  assert.deepEqual(ctx2.eventos.map((e) => e.tipo), ['piensa']); assert.equal(ctx2.eventos[0].texto, 'Sigo sin nada.');

  const cliente3 = clienteFalso([{ stop_reason: 'end_turn', content: [texto('Espero a Advisor.')] }]);
  const c3 = corredor(cliente3); const ctx3 = ctxFalso({ esperaAAlguien: true }); await c3.correrTurno('bienestar', lote, ctx3);
  assert.equal(cliente3.pedidos.length, 1); assert.deepEqual(ctx3.eventos.map((e) => e.tipo), ['piensa']);
});

test('error de API o refusal: el turno termina sin romper la conversación', async () => {
  const c = corredor(clienteFalso([{ stop_reason: 'refusal', content: [texto('No.')] }]));
  const ctx = ctxFalso(); await c.correrTurno('bienestar', lote, ctx);
  formaValida(c.conversacion('bienestar')); assert.deepEqual(ctx.eventos, []);
  const c2 = corredor(clienteFalso([]));
  await assert.rejects(() => c2.correrTurno('bienestar', lote, ctxFalso()), /sin respuesta guionada/);
  assert.equal(c2.conversacion('bienestar').length, 1, 'queda el user; el próximo turno agrega otro user (se fusionan)');
});
