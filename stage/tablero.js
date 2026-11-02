// El Tablero (sin DOM): tareas y subtareas, estados y permisos, reconstruido a partir de eventos `tarea`.
// Lo usan el servidor (servidor/tablero.mjs: valida, emite al bus) y la vista (stage/tablero.html e index.html:
// reproducen los eventos, en vivo o de una grabación). Regla de la casa: los agentes crean, hacen el trabajo que una
// persona les asigna (lo toman, lo entregan En revisión) y verifican; las personas asignan, avanzan y cierran.
// Nada llega a "lista" sin una persona.
//
// Eventos (todos con tipo: 'tarea', t, quien = 'persona' | id de agente):
//   { op: 'crear',   id, titulo, origen }                                 una Tarea (un caso)
//   { op: 'sub',     id, tarea, texto, responsable, agente?, estado?, nota? }  una SubTarea (una acción) dentro de una Tarea
//   { op: 'mover',   id, estado, nota? }                                  cambia el estado de una SubTarea
//   { op: 'asignar', id, responsable, agente? }                           cambia el responsable (una persona, un área, o un agente: `agente` es su id)

export const ESTADOS = ['pendiente', 'progreso', 'revision', 'lista'];
export const ETIQUETAS = { pendiente: 'Pendiente', progreso: 'En progreso', revision: 'En revisión', lista: 'Lista', descartada: 'Descartada' };
export const esPersona = (quien) => !quien || quien === 'persona' || String(quien).startsWith('persona');

/** ¿Puede `quien` llevar una subtarea de `desde` a `hasta`? Los agentes la toman (pendiente → en progreso), la entregan
 * (→ en revisión) o la devuelven (revisión → pendiente). Lista es de las personas. */
export function puedeMover(quien, desde, hasta) {
  if (!ETIQUETAS[hasta] || desde === hasta) return false;
  if (esPersona(quien)) return true;
  if (hasta === 'progreso') return desde === 'pendiente';
  if (hasta === 'revision') return desde === 'pendiente' || desde === 'progreso';
  if (hasta === 'pendiente') return desde === 'revision';
  return false;
}
/** Los agentes que pueden ser responsables de una acción (trabajo interno: un borrador, una práctica, un plan). */
export const AGENTES = { tutor: 'Tutor', advisor: 'Advisor', bienestar: 'Bienestar', admisiones: 'Admisiones', academia: 'Academia' };   // Coordinación reparte, no entrega

/** Estado de una Tarea, derivado de sus subtareas (las descartadas no cuentan). */
export function estadoDeTarea(t) {
  const vivas = t.subtareas.filter((s) => s.estado !== 'descartada');
  if (!vivas.length) return 'pendiente';
  if (vivas.every((s) => s.estado === 'lista')) return 'lista';
  if (vivas.some((s) => s.estado === 'revision') && vivas.every((s) => s.estado === 'revision' || s.estado === 'lista')) return 'revision';
  if (vivas.some((s) => s.estado !== 'pendiente')) return 'progreso';
  return 'pendiente';
}

export function crearTablero() {
  let tareas = [];
  const sub = (id) => { for (const t of tareas) { const s = t.subtareas.find((x) => x.id === id); if (s) return { t, s }; } return null; };
  function aplicar(ev) {
    if (!ev || ev.tipo !== 'tarea') return false;
    const t = typeof ev.t === 'number' ? ev.t : 0, quien = ev.quien || 'persona';
    if (ev.op === 'crear') { if (tareas.some((x) => x.id === ev.id)) return false; tareas.push({ id: ev.id, titulo: String(ev.titulo || ''), origen: String(ev.origen || ''), creadaPor: quien, t, subtareas: [] }); return true; }
    if (ev.op === 'sub') {
      const tarea = tareas.find((x) => x.id === ev.tarea); if (!tarea || sub(ev.id)) return false;
      tarea.subtareas.push({ id: ev.id, texto: String(ev.texto || ''), responsable: String(ev.responsable || ''), agente: AGENTES[ev.agente] ? ev.agente : null, estado: ETIQUETAS[ev.estado] ? ev.estado : 'pendiente', creadaPor: quien, nota: ev.nota ? String(ev.nota) : '', t, tMov: t });
      return true;
    }
    const x = sub(ev.id); if (!x) return false;
    if (ev.op === 'mover') { if (!puedeMover(quien, x.s.estado, ev.estado)) return false; x.s.estado = ev.estado; x.s.tMov = t; if (ev.nota) x.s.nota = String(ev.nota); x.s.movidaPor = quien; return true; }
    if (ev.op === 'asignar') { if (!esPersona(quien)) return false; x.s.responsable = String(ev.responsable || ''); x.s.agente = AGENTES[ev.agente] ? ev.agente : null; return true; }
    return false;
  }
  return {
    aplicar,
    get tareas() { return tareas; },
    tarea: (id) => tareas.find((x) => x.id === id) || null,
    subtarea: (id) => (sub(id) || {}).s || null,
    /** Busca una subtarea por su texto (sin tildes, por inclusión), para las herramientas de los agentes. */
    buscar(texto) { const n = norm(texto); const hits = []; for (const t of tareas) for (const s of t.subtareas) if (norm(s.texto).includes(n) || n.includes(norm(s.texto))) hits.push(s); return hits; },
    /** Las acciones asignadas a un agente (su trabajo pendiente o en curso). */
    asignadasA(agenteId) { return this.subtareas.filter((s) => s.agente === agenteId && (s.estado === 'pendiente' || s.estado === 'progreso')); },
    /** Las subtareas, aplanadas, con su tarea. */
    get subtareas() { return tareas.flatMap((t) => t.subtareas.map((s) => ({ ...s, tarea: t }))); },
    reiniciar() { tareas = []; },
  };
}
const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/**
 * Los eventos que una decisión de la persona genera en el tablero: una Tarea por el caso y una SubTarea por acción
 * (aprobada → pendiente con su responsable; "lo hago yo" → pendiente, responsable la persona; "no" → descartada).
 * decision: { caso, objetivo, acciones: [{ texto, quien, estado: 'si'|'yo'|'no' }] }. ids: función que da ids nuevos.
 */
export function eventosDeDecision(decision, { nombrePersona = 'Dirección', ids = contador() } = {}) {
  if (!decision || !Array.isArray(decision.acciones) || !decision.acciones.length) return [];
  const idT = ids('t');
  const caso = String(decision.caso || '').trim(), objetivo = String(decision.objetivo || '').trim();
  const titulo = caso && !/^caso\s*\d*$/i.test(caso) ? caso : objetivo ? (objetivo.length > 60 ? objetivo.slice(0, 57).replace(/\s+\S*$/, '') + '…' : objetivo) : 'Caso';   // sin nombre de caso, el objetivo
  const evs = [{ tipo: 'tarea', op: 'crear', id: idT, titulo, origen: objetivo, quien: 'persona' }];
  for (const a of decision.acciones) {
    if (!a || !a.texto) continue;
    const estado = a.estado === 'no' ? 'descartada' : 'pendiente';
    const responsable = a.estado === 'yo' ? nombrePersona : a.estado === 'no' ? '' : areaDe(a.quien);
    evs.push({ tipo: 'tarea', op: 'sub', id: ids('s'), tarea: idT, texto: mayus(String(a.texto).trim()), responsable, estado, quien: 'persona' });
  }
  return evs;
}
/** Los responsables son personas o áreas de personas: "Bienestar" (el agente) pasa a "Equipo de Bienestar". */
export function areaDe(quien) {
  const q = String(quien || '').trim(); if (!q) return '';
  const n = norm(q);
  if (['bienestar', 'tutor', 'advisor', 'admisiones', 'academia', 'coordinacion'].includes(n)) return { bienestar: 'Equipo de Bienestar', tutor: 'Docente', advisor: 'Secretaría', admisiones: 'Admisiones', academia: 'Académica', coordinacion: 'Coordinación' }[n];
  return mayus(q);
}
const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export function contador(desde = 0) { let n = desde; return (pref) => `${pref}${++n}`; }
