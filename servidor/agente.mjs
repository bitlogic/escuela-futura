// Un turno de un agente contra la API de Anthropic: arma el system (instrucciones + persona), ofrece sus
// herramientas más enviar_mensaje, y corre el bucle de tool use. La conversación de cada agente se guarda
// entre turnos (solo se agrega al final; nunca se edita). Lo que el agente escribe fuera de enviar_mensaje
// no va al chat: se muestra como "piensa" en el mapa.

import { HERRAMIENTA_LUGAR, HERRAMIENTA_TEXTO } from '../stage/herramientas.js';

export const ENVIAR_MENSAJE = {
  name: 'enviar_mensaje',
  description: 'Mandá un mensaje al canal #coordinacion. Es la única forma de que te lean. Mencioná con @Nombre a quien le hablás (@todos para el equipo); sin mención, le respondés a quien te escribió.',
  input_schema: { type: 'object', properties: { texto: { type: 'string', description: 'El mensaje, en texto plano' } }, required: ['texto'], additionalProperties: false },
  strict: true,
};

const EMPUJON = 'No mandaste ningún mensaje. Si eso era una respuesta, mandala con enviar_mensaje. Si no, no hagas nada.';

export function formatearLote(lote) {
  const partes = [];
  if (lote.mensajes.length) partes.push('Mensajes nuevos en #coordinacion:\n' + lote.mensajes.map((m) => `[${m.hora}] ${m.nombre}: ${m.texto}`).join('\n'));
  if (lote.terminaronSin.length) partes.push(`Terminaron sin responderte: ${lote.terminaronSin.join(', ')}.`);
  if (lote.faltan.length) partes.push(`Todavía no respondieron: ${lote.faltan.join(', ')}.`);
  return partes.join('\n\n') || 'Sin novedades.';
}

/**
 * @param {object} o
 * @param {object} o.cliente       cliente de @anthropic-ai/sdk (o uno falso en tests): cliente.beta.messages.create
 * @param {string} o.modelo
 * @param {string} o.effort        low | medium | high
 * @param {string} o.instrucciones pack/instructions.md
 * @param {Array}  o.agentes       de personas.mjs
 * @param {Array}  o.herramientas  TOOLS de mcp-escuela/herramientas.mjs
 * @param {(nombre: string, args: object) => string} o.ejecutar
 * @param {number} [o.enParalelo]  llamadas a la API a la vez
 */
export function crearCorredor({ cliente, modelo, effort = 'medium', instrucciones, agentes, herramientas, ejecutar, maxTokens = 8000, enParalelo = 4, fallbacks = true, log = () => {} }) {
  const porId = new Map(agentes.map((a) => [a.id, a]));
  const conversaciones = new Map();
  const defs = new Map(herramientas.map((h) => [h.name, { name: h.name, description: h.description, input_schema: h.inputSchema }]));

  // Semáforo chiquito: no más de `enParalelo` llamadas a la vez
  let enCurso = 0; const esperando = [];
  const tomar = () => new Promise((ok) => { if (enCurso < enParalelo) { enCurso++; ok(); } else esperando.push(ok); });
  const soltar = () => { if (esperando.length) esperando.shift()(); else enCurso--; };

  const controladores = new Set();
  function configDe(a) {
    const system = [{ type: 'text', text: `${instrucciones}\n\n---\n\n${a.prompt}`, cache_control: { type: 'ephemeral' } }];
    const tools = [...a.herramientas.map((n) => { const d = defs.get(n); if (!d) throw new Error(`${a.id}: herramienta desconocida ${n}`); return d; }), ENVIAR_MENSAJE];
    return { system, tools };
  }

  async function llamar(a, mensajes, signal) {
    const { system, tools } = configDe(a);
    await tomar();
    try {
      return await cliente.beta.messages.create({
        model: modelo, max_tokens: maxTokens, system, tools, messages: mensajes,
        output_config: { effort },
        ...(fallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
      }, { signal });
    } finally { soltar(); }
  }

  /** Corre un turno. `ctx` viene del bus: enviar, nuevos, esperaAAlguien, lePidieron, emitir, vigente. */
  async function correrTurno(id, lote, ctx) {
    const a = porId.get(id); if (!a) throw new Error(`agente desconocido: ${id}`);
    if (!conversaciones.has(id)) conversaciones.set(id, []);
    const mensajes = conversaciones.get(id);
    const ac = new AbortController(); controladores.add(ac);
    let mando = false, textoFinal = '', empujado = false;
    try {
      mensajes.push({ role: 'user', content: formatearLote(lote) });
      for (let i = 0; i < 12; i++) {
        const resp = await llamar(a, mensajes, ac.signal);
        if (!ctx.vigente()) return;
        if (!resp.content.length) break;
        mensajes.push({ role: 'assistant', content: resp.content });
        textoFinal = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        const usos = resp.content.filter((b) => b.type === 'tool_use');
        if (resp.stop_reason === 'refusal' || resp.stop_reason === 'max_tokens') { log('corte', a.nombre, resp.stop_reason); textoFinal = ''; break; }
        if (!usos.length || resp.stop_reason !== 'tool_use') {
          // Texto solo. Si le pidieron algo y no está esperando a nadie, un solo empujón.
          if (!mando && textoFinal && !empujado && ctx.lePidieron() && !ctx.esperaAAlguien()) { empujado = true; mensajes.push({ role: 'user', content: EMPUJON }); continue; }
          break;
        }
        const resultados = [];
        for (const u of usos) {
          let content, is_error = false;
          try {
            if (u.name === 'enviar_mensaje') { content = ctx.enviar(String(u.input.texto || '')); mando = true; }
            else {
              const arg = u.input && (u.input.estudiante || u.input.curso) ? String(u.input.estudiante || u.input.curso) : '';
              ctx.emitir({ tipo: 'herramienta', herramienta: u.name, lugar: HERRAMIENTA_LUGAR[u.name] || null, texto: (HERRAMIENTA_TEXTO[u.name] || u.name) + (arg ? ' de ' + arg : '') });
              content = ejecutar(u.name, u.input || {});
            }
          } catch (e) { content = e.message; is_error = true; }
          resultados.push({ type: 'tool_result', tool_use_id: u.id, content, ...(is_error ? { is_error } : {}) });
        }
        const nuevos = ctx.nuevos();
        const bloques = nuevos.length ? [...resultados, { type: 'text', text: 'Mensajes nuevos mientras trabajabas:\n' + nuevos.map((m) => `[${m.hora}] ${m.nombre}: ${m.texto}`).join('\n') }] : resultados;
        mensajes.push({ role: 'user', content: bloques });
      }
      // Una nota corta ("Espero a Advisor.") se muestra; un razonamiento largo no se proyecta
      if (!mando && textoFinal) { const nota = textoFinal.replace(/\s+/g, ' ').trim(); ctx.emitir({ tipo: 'piensa', texto: nota.length <= 80 ? nota : 'Sin novedades.' }); }
    } finally { controladores.delete(ac); }
  }

  return {
    correrTurno,
    reiniciar() { conversaciones.clear(); for (const c of controladores) c.abort(); controladores.clear(); },
    conversacion: (id) => conversaciones.get(id) || [],
  };
}
