// El Tablero en el servidor: valida cada operación con el modelo (stage/tablero.js), la emite al bus como evento
// `tarea` (así llega a la vista por SSE y queda en la grabación) y la aplica. Las personas operan por la API;
// los agentes por dos herramientas: proponer_tarea (crea, queda "propuesta por") y revisar_tarea (a revisión o
// de vuelta a pendiente, con una nota). Reiniciar la sesión vacía el tablero: las tareas nacen de los objetivos.

import { crearTablero, puedeMover, eventosDeDecision, areaDe, contador, ETIQUETAS } from '../stage/tablero.js';

export const HERRAMIENTAS_TABLERO = [
  {
    name: 'proponer_tarea',
    description: 'Anota en el Tablero una acción que le corresponde a una persona y no necesita decisión de Dirección (un trámite, un aviso). Queda pendiente, marcada como propuesta tuya. No la uses para lo que va en una propuesta a Dirección.',
    inputSchema: { type: 'object', properties: { caso: { type: 'string', description: 'A quién o a qué corresponde, ej. "Lucía P." o "Mesas de noviembre"' }, accion: { type: 'string', description: 'La acción, en 2 a 6 palabras' }, responsable: { type: 'string', description: 'Quién la hace: Secretaría, docente, Equipo de Bienestar, Admisiones, Dirección' } }, required: ['caso', 'accion', 'responsable'] },
  },
  {
    name: 'revisar_tarea',
    description: 'Mueve una acción del Tablero a "En revisión" cuando verificaste con datos que está hecha (o la devuelve a "Pendiente" si no lo está), con una nota de una línea con el dato. Solo una persona la pone en "Lista".',
    inputSchema: { type: 'object', properties: { accion: { type: 'string', description: 'El texto de la acción, como figura en el Tablero' }, estado: { type: 'string', enum: ['revision', 'pendiente'] }, nota: { type: 'string', description: 'El dato que lo sostiene, en una línea' } }, required: ['accion', 'estado', 'nota'] },
  },
];
export const NOMBRES_HERRAMIENTAS = new Set(HERRAMIENTAS_TABLERO.map((h) => h.name));

/**
 * @param {object} o
 * @param {{ emitir: Function }} o.bus   emite eventos a la vista y a la grabación
 * @param {string} o.nombrePersona
 */
export function crearTableroServidor({ bus, nombrePersona = 'Dirección', log = () => {} }) {
  const modelo = crearTablero();
  let ids = contador();
  const emitir = (ev) => { const e = bus.emitir({ tipo: 'tarea', ...ev }); modelo.aplicar(e); log('tarea', ev.op, ev.id, ev.quien); return e; };

  /** Una operación de la persona (desde la vista). Devuelve el evento o lanza con un mensaje claro. */
  function operar(op, quien = 'persona') {
    const o = { ...op }; delete o.tipo; delete o.t;
    if (o.op === 'crear') { if (!String(o.titulo || '').trim()) throw new Error('Falta el título de la tarea.'); return emitir({ op: 'crear', id: ids('t'), titulo: String(o.titulo).trim().slice(0, 120), origen: String(o.origen || '').slice(0, 300), quien }); }
    if (o.op === 'sub') {
      if (!modelo.tarea(o.tarea)) throw new Error('No existe esa tarea.');
      if (!String(o.texto || '').trim()) throw new Error('Falta el texto de la acción.');
      return emitir({ op: 'sub', id: ids('s'), tarea: o.tarea, texto: String(o.texto).trim().slice(0, 120), responsable: areaDe(o.responsable).slice(0, 60), estado: ETIQUETAS[o.estado] ? o.estado : 'pendiente', nota: String(o.nota || '').slice(0, 200), quien });
    }
    const s = modelo.subtarea(o.id); if (!s) throw new Error('No existe esa acción.');
    if (o.op === 'mover') {
      if (!ETIQUETAS[o.estado]) throw new Error('Estado desconocido.');
      if (!puedeMover(quien, s.estado, o.estado)) throw new Error(quien === 'persona' ? `Ya está en ${ETIQUETAS[s.estado]}.` : `Un agente no puede pasar una acción a "${ETIQUETAS[o.estado]}": eso lo hace una persona.`);
      return emitir({ op: 'mover', id: o.id, estado: o.estado, nota: String(o.nota || '').slice(0, 200), quien });
    }
    if (o.op === 'asignar') { if (quien !== 'persona') throw new Error('El responsable lo cambia una persona.'); return emitir({ op: 'asignar', id: o.id, responsable: areaDe(o.responsable).slice(0, 60), quien }); }
    throw new Error('Operación desconocida.');
  }

  /** La decisión de la tarjeta del chat: una tarea por el caso, una acción por lo aprobado. */
  function desdeDecision(decision) {
    const evs = eventosDeDecision(decision, { nombrePersona, ids });
    for (const e of evs) emitir(e);
    return evs;
  }

  /** Las herramientas de los agentes. Devuelven el texto del tool_result (o lanzan). */
  function ejecutar(agenteId, nombre, args = {}) {
    if (nombre === 'proponer_tarea') {
      const caso = String(args.caso || '').trim(), accion = String(args.accion || '').trim(), responsable = areaDe(args.responsable);
      if (!caso || !accion || !responsable) throw new Error('Faltan caso, acción o responsable.');
      let t = modelo.tareas.find((x) => x.titulo.toLowerCase() === caso.toLowerCase());
      if (!t) { const e = emitir({ op: 'crear', id: ids('t'), titulo: caso.slice(0, 120), origen: '', quien: agenteId }); t = modelo.tarea(e.id); }
      if (t.subtareas.some((s) => s.texto.toLowerCase() === accion.toLowerCase())) return `Ya estaba en el Tablero: "${accion}" (${caso}).`;
      emitir({ op: 'sub', id: ids('s'), tarea: t.id, texto: accion.slice(0, 120), responsable, estado: 'pendiente', quien: agenteId });
      return `Anotada en el Tablero, pendiente: "${accion}" (${caso}), responsable ${responsable}. Una persona decide cuándo se hace.`;
    }
    if (nombre === 'revisar_tarea') {
      const hits = modelo.buscar(String(args.accion || ''));
      if (!hits.length) throw new Error(`No encuentro en el Tablero una acción que diga "${args.accion}". Las que hay: ${modelo.subtareas.map((s) => `"${s.texto}" (${ETIQUETAS[s.estado]})`).join(', ') || 'ninguna'}.`);
      const s = hits[0]; const estado = args.estado === 'pendiente' ? 'pendiente' : 'revision';
      if (!puedeMover(agenteId, s.estado, estado)) throw new Error(`"${s.texto}" está en ${ETIQUETAS[s.estado]}: no la podés pasar a ${ETIQUETAS[estado]}. Solo una persona la pone en Lista.`);
      emitir({ op: 'mover', id: s.id, estado, nota: String(args.nota || '').slice(0, 200), quien: agenteId });
      return `"${s.texto}" pasó a ${ETIQUETAS[estado]} con tu nota. La cierra una persona.`;
    }
    throw new Error(`Herramienta desconocida: ${nombre}`);
  }

  return {
    operar, desdeDecision, ejecutar,
    estado: () => ({ tareas: modelo.tareas }),
    reiniciar() { modelo.reiniciar(); ids = contador(); },
  };
}
