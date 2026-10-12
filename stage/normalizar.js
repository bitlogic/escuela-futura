// Normaliza eventos del relay de Buzz (mensajes kind 9 + telemetría kind 24200 descifrada)
// a una línea de tiempo simple que la vista de escenario sabe dibujar.
//
// Sirve tanto para reproducir una corrida exportada por buzz-probe como para el modo en vivo.
// Sin dependencias; es un módulo ES que corre en el navegador y en Node.

/** Herramienta MCP → lugar de la escuela al que va el agente para usarla. */
export const HERRAMIENTA_LUGAR = {
  buscar_estudiantes: 'coordinacion',
  ver_programa: 'biblioteca',
  ver_asistencia: 'aula-bio1',
  ver_actividad_campus: 'aula-bio1',
  ver_alertas_previas: 'bienestar',
  ver_uso_tutor: 'aula-bio1',
  ver_notas: 'aula-bio1',
  ver_situacion_administrativa: 'secretaria',
  ver_ingresantes: 'admisiones',
  ver_aspirantes: 'admisiones',
};

/** Cómo se lee cada herramienta en el globo del agente. */
export const HERRAMIENTA_TEXTO = {
  buscar_estudiantes: 'Busco la lista del curso',
  ver_programa: 'Reviso el programa de la materia',
  ver_asistencia: 'Reviso la asistencia',
  ver_actividad_campus: 'Reviso la actividad en el campus',
  ver_alertas_previas: 'Reviso alertas anteriores',
  ver_uso_tutor: 'Reviso las consultas al tutor',
  ver_notas: 'Reviso las notas',
  ver_situacion_administrativa: 'Reviso inscripciones y pagos',
  ver_ingresantes: 'Reviso cómo ingresó',
  ver_aspirantes: 'Reviso los aspirantes',
};

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Extrae los mensajes que un agente manda con `buzz messages send` dentro de un comando de shell. */
export function extraerEnvios(command) {
  const out = [];
  const lines = String(command).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('buzz messages send')) continue;
    const mentions = [...line.matchAll(/--mention\s+([0-9a-f]{64})/g)].map((m) => m[1]);
    let body = null;
    const inline = line.match(/--content\s+"((?:[^"\\]|\\.)*)"/) || line.match(/--content\s+'((?:[^'\\]|\\.)*)'/);
    if (inline) body = inline[1];
    const printf = line.match(/^\s*printf\s+'((?:[^'\\]|\\.)*)'\s*\|/);
    if (!body && printf) body = printf[1].replace(/\\n/g, '\n');
    if (!body && /<<\s*'?EOF'?/.test(lines.slice(0, i + 1).join('\n'))) {
      const start = lines.findIndex((l, k) => k <= i && /<<\s*'?EOF'?/.test(l));
      const bodyLines = [];
      for (let k = (start >= 0 ? Math.max(start, i) : i) + 1; k < lines.length; k++) {
        if (lines[k].trim() === 'EOF') break;
        bodyLines.push(lines[k]);
      }
      body = bodyLines.join('\n');
    }
    if (body === null) continue;
    body = body.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\$/g, '$').trim();
    if (body) out.push({ mentions, body });
  }
  return out;
}

/** Recorre un frame de telemetría (puede ser un batch) y devuelve los sub-frames planos. */
function aplanar(frame, acc = []) {
  if (!frame || typeof frame !== 'object') return acc;
  if (frame.kind === 'batch' && frame.payload && Array.isArray(frame.payload.events)) {
    for (const e of frame.payload.events) aplanar(e, acc);
  } else {
    acc.push(frame);
  }
  return acc;
}

/**
 * @param {Array} eventos  Eventos tal como los exporta buzz-probe (con `_descifrado` en los 24200).
 * @param {object} opts    { nombres, agentes: [{id, nombre, pubkey?}], canal?: id de canal para filtrar, desde?: epoch ms, tInicio? }
 * @returns {Array} línea de tiempo ordenada: {t, tipo, quien, a?, texto?, herramienta?, lugar?}
 */
export function crearNormalizador(opts = {}) {
  const nombres = { ...(opts.nombres || {}) };
  const agentes = opts.agentes || [];
  const porPubkey = {};
  const porNombre = {};
  for (const a of agentes) { if (a.pubkey) porPubkey[a.pubkey] = a.id; porNombre[norm(a.nombre)] = a.id; porNombre[norm(a.id)] = a.id; }
  const idDe = (pubkey) => {
    if (porPubkey[pubkey]) return porPubkey[pubkey];
    const n = nombres[pubkey];
    if (n && porNombre[norm(n)]) { porPubkey[pubkey] = porNombre[norm(n)]; return porPubkey[pubkey]; }
    return null; // persona
  };
  const nombreDe = (pubkey) => nombres[pubkey] || (pubkey ? pubkey.slice(0, 8) : '');
  const personaPorNombre = (nombre) => { for (const [pk, n] of Object.entries(nombres)) if (norm(n) === nombre && !idDe(pk)) return 'persona:' + pk; return null; };
  const enCanal = (id) => !opts.canal || (id && String(id).startsWith(opts.canal));
  const desde = opts.desde != null ? opts.desde : -Infinity;

  const toolsVistas = new Map(); // toolCallId → {toolName, emitido}
  const enviosVistos = new Set();

  /** Procesa un lote de eventos (o uno solo) y devuelve los eventos de línea de tiempo nuevos, con t absoluto en ms. */
  return function procesar(eventos) {
  const linea = [];
  for (const e of eventos) {
    if (e.kind === 0) { try { const p = JSON.parse(e.content); nombres[e.pubkey] = p.display_name || p.name || nombres[e.pubkey]; } catch {} }
  }
  for (const e of eventos) {
    if (e.kind === 0) continue;
    if (e.kind === 9 || e.kind === 40002) {
      const quien = idDe(e.pubkey);
      if (quien) continue; // los mensajes de agentes salen de la telemetría (con destinatarios)
      if (!enCanal((e.tags.find((t) => t[0] === 'h') || [])[1]) || e.created_at * 1000 < desde) continue;
      const a = e.tags.filter((t) => t[0] === 'p').map((t) => idDe(t[1])).filter(Boolean);
      linea.push({ t: e.created_at * 1000, tipo: 'persona', quien: 'persona:' + e.pubkey, nombre: nombreDe(e.pubkey), a, texto: e.content, sintetico: !!e._sintetico });
      continue;
    }
    if (e.kind !== 24200 || !e._descifrado || e._descifrado.error) continue;
    const agentePub = (e.tags.find((t) => t[0] === 'agent') || [])[1] || e.pubkey;
    const quien = idDe(agentePub) || 'agente:' + agentePub.slice(0, 8);
    for (const f of aplanar(e._descifrado)) {
      const t = Date.parse(f.timestamp) || e.created_at * 1000;
      if (!enCanal(f.channelId) || t < desde) continue;
      if (f.kind === 'turn_started') { linea.push({ t, tipo: 'inicio', quien }); continue; }
      if (f.kind === 'turn_completed') { linea.push({ t, tipo: 'fin', quien }); continue; }
      if (f.kind !== 'acp_read') continue;
      const u = f.payload && f.payload.params && f.payload.params.update;
      if (!u) continue;
      if (u.sessionUpdate !== 'tool_call' && u.sessionUpdate !== 'tool_call_update') continue;
      const id = u.toolCallId || (u.title + ':' + t);
      const prev = toolsVistas.get(id) || {};
      const toolName = (u._meta && u._meta.claudeCode && u._meta.claudeCode.toolName) || prev.toolName || null;
      const rawInput = (u.rawInput && Object.keys(u.rawInput).length ? u.rawInput : prev.rawInput) || null;
      const reg = { toolName, rawInput, emitido: prev.emitido || false };
      toolsVistas.set(id, reg);
      if (reg.emitido) continue;
      if (toolName && toolName.startsWith('mcp__')) {
        const h = toolName.split('__').pop();
        const arg = rawInput && (rawInput.estudiante || rawInput.curso) ? String(rawInput.estudiante || rawInput.curso) : '';
        linea.push({ t, tipo: 'herramienta', quien, herramienta: h, lugar: HERRAMIENTA_LUGAR[h] || null, texto: (HERRAMIENTA_TEXTO[h] || h) + (arg ? ' de ' + arg : '') });
        reg.emitido = true;
      } else if (toolName === 'Bash' && rawInput && rawInput.command && rawInput.command.includes('buzz messages send')) {
        for (const env of extraerEnvios(rawInput.command)) {
          const key = quien + '|' + env.body.slice(0, 80);
          if (enviosVistos.has(key)) continue;
          enviosVistos.add(key);
          const a = env.mentions.map((m) => idDe(m) || 'persona:' + m);
          // También @menciones en el cuerpo, por si el comando no lleva --mention
          for (const m of env.body.matchAll(/@([A-Za-zÁÉÍÓÚáéíóúñÑ]+(?: [A-Za-zÁÉÍÓÚáéíóúñÑ]+)?)/g)) {
            const id = porNombre[norm(m[1])] || porNombre[norm(m[1].split(' ')[0])] || personaPorNombre(norm(m[1]));
            if (id && !a.includes(id)) a.push(id);
          }
          linea.push({ t, tipo: 'dice', quien, a, texto: env.body });
        }
        reg.emitido = true;
      } else if (toolName && toolName !== 'Bash' && toolName !== 'ToolSearch') {
        linea.push({ t, tipo: 'piensa', quien, texto: 'Consulto ' + toolName });
        reg.emitido = true;
      }
    }
  }
  linea.sort((a, b) => a.t - b.t);
  return linea;
  };
}

/**
 * @param {Array} eventos  Eventos tal como los exporta buzz-probe (con `_descifrado` en los 24200).
 * @param {object} opts    ver crearNormalizador; además tInicio? (epoch ms) para que t sea relativo.
 */
export function normalizar(eventos, opts = {}) {
  const linea = crearNormalizador(opts)(eventos);
  const t0 = opts.tInicio != null ? opts.tInicio : (linea.length ? linea[0].t : 0);
  for (const ev of linea) ev.t = ev.t - t0;
  return linea;
}
