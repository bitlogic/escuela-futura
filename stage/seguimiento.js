// Seguimiento del pedido en curso (sin DOM): qué pidió la persona, qué viene pasando (un registro de actividad que se
// escribe con los eventos reales), si está esperando algo de la persona y, al cumplirse, el ciclo de vida completo.
// Se alimenta con los mismos eventos que mueven el mapa (persona, inicio, herramienta, fin, dice). Un "pedido" nace con
// cada mensaje de la persona que no sea una decisión: un objetivo (sin @mención) o una pregunta a un agente.
// Estados: enviado → repartido → propuesta → decidido → cerrado (objetivo) · enviado → cerrado (pregunta).
//
// Mientras hay una propuesta sin responder, un mensaje de la persona es una de tres cosas: una **consulta** (lleva
// @mención a un agente o es una pregunta: la propuesta sigue esperando, la respuesta es un hito), una **decisión**
// (lo demás; o, desde la tarjeta, `ev.decision` estructurada: acción por acción, sí / lo hago yo / no) o nada más.
// De la decisión sale el **plan de acción**: qué, quién, estado (pendiente / hecha / descartada); la persona lo cierra a mano.

const esPersona = (x) => String(x || '').startsWith('persona:');

export function crearSeguimiento({ agenteDe = () => null, esPropuesta = () => false, accionesDe = () => [], nombrePersona = 'Dirección' } = {}) {
  let pedidos = [];
  const actual = () => pedidos[pedidos.length - 1] || null;
  const conPropuesta = () => [...pedidos].reverse().find((x) => x.estado === 'propuesta') || null;
  const hito = (p, t, tipo, texto, extra = {}) => p.hitos.push({ t: t ?? p.tUltimo ?? p.t0, tipo, texto, ...extra });

  function decidir(p, t, texto, decision) {
    p.estado = 'decidido'; p.decision = texto; p.tUltimo = t; hito(p, t, 'decision', texto);
    p.plan = planDe(decision, accionesDe(p.propuesta), texto, typeof nombrePersona === 'function' ? nombrePersona() : nombrePersona);   // función: el nombre llega después (lo manda el servidor)
    p.decisionTipo = tipoDeDecision(decision, p.plan, texto);
    p.decisionNota = decision && decision.nota ? String(decision.nota) : '';   // la nota de la tarjeta: la vista la muestra después de un recargo o en grabación
  }
  function aplicar(ev) {
    const t = typeof ev.t === 'number' ? ev.t : undefined;
    if (ev.tipo === 'persona') {
      const texto = String(ev.texto || '');
      const menciones = [...texto.matchAll(/@([A-Za-zÁÉÍÓÚáéíóúñÑ]+)/g)].map((m) => agenteDe(m[1])).filter(Boolean);
      const pd = conPropuesta();
      if (pd && ev.decision && typeof ev.decision === 'object') { decidir(pd, t, texto, ev.decision); return; }
      if (pd && !menciones.length && !/[¿?]/.test(texto)) { decidir(pd, t, texto); return; }   // la respuesta a la propuesta no es un pedido nuevo
      if (pd) { const a = menciones[0] || 'coordinacion'; pd.consultas[a] = 'pendiente'; pd.tUltimo = t; hito(pd, t, 'consulta', texto, { a }); return; }   // consultar no es decidir: la propuesta sigue esperando
      const n = { texto, objetivo: !menciones.length, estado: 'enviado', agentes: {}, vivos: {}, consultas: {}, avisos: 0, repartido: false, ack: null, propuesta: null, decision: null, plan: null, cierre: null, hitos: [], t0: t ?? 0, tUltimo: t, tFin: null };
      for (const id of menciones) n.agentes[id] = 'pendiente';
      hito(n, t, 'recibido', n.objetivo ? 'Objetivo recibido' : 'Pedido enviado');
      pedidos.push(n); return;
    }
    const p = (() => { const x = actual(); return x && x.estado !== 'cerrado' ? x : conPropuesta(); })(); if (!p) return;
    const id = ev.quien; if (!id) return;
    if (t !== undefined) p.tUltimo = t;
    if (ev.tipo === 'inicio') {
      p.vivos[id] = { desde: t ?? 0, herramienta: null, tHerr: 0 }; if (p.agentes[id]) p.agentes[id] = 'trabajando';
      // Coordinación arranca con todas las respuestas: desde acá está preparando la propuesta, aunque un aviso tardío despierte a alguien
      if (id === 'coordinacion' && p.repartido && Object.keys(p.agentes).length && Object.values(p.agentes).every((e) => e === 'respondio')) p.preparando = true;
      return;
    }
    if (ev.tipo === 'herramienta') { if (p.vivos[id]) { p.vivos[id].herramienta = ev.texto || ev.herramienta || ''; p.vivos[id].tHerr = t ?? 0; } return; }
    if (ev.tipo === 'fin') {
      delete p.vivos[id];
      if (p.agentes[id] === 'trabajando') p.agentes[id] = 'listo';
      if (id === 'coordinacion' && p.objetivo && p.estado === 'enviado' && p.ack && !p.repartido) cerrar(p, t, p.ack);   // contestó sin repartir
      return;
    }
    if (ev.tipo !== 'dice') return;
    const a = ev.a || [], aAgentes = a.filter((x) => !esPersona(x)), aPersona = a.some(esPersona);
    if (id === 'coordinacion' && aAgentes.length && p.objetivo && ['enviado', 'repartido'].includes(p.estado)) {   // reparte (en uno o varios mensajes)
      const nuevos = aAgentes.filter((x) => !p.agentes[x]);
      p.repartido = true; p.estado = 'repartido';
      for (const x of nuevos) p.agentes[x] = 'pendiente';
      const ult = p.hitos[p.hitos.length - 1];
      if (ult && ult.tipo === 'reparto' && Math.abs((ult.t ?? 0) - (t ?? 0)) < 2000) ult.a.push(...nuevos); else hito(p, t, 'reparto', '', { a: [...nuevos] });
    } else if (id !== 'coordinacion' && aAgentes.length && !aAgentes.includes('coordinacion')) { p.avisos++; hito(p, t, 'aviso', '', { de: id, a: aAgentes[0] }); }
    if (id !== 'coordinacion' && aAgentes.includes('coordinacion') && p.agentes[id] && p.agentes[id] !== 'respondio') { p.agentes[id] = 'respondio'; hito(p, t, 'respondio', '', { de: id }); }
    if (!aPersona) return;
    if (esPropuesta(ev.texto)) { p.estado = 'propuesta'; p.propuesta = ev.texto; hito(p, t, 'propuesta', ev.texto); return; }
    if (p.consultas[id] === 'pendiente' || (p.estado === 'propuesta') || (p.estado === 'decidido' && id !== 'coordinacion')) { p.consultas[id] = 'respondio'; hito(p, t, 'consultado', ev.texto, { de: id }); return; }   // respuesta a una consulta: no cierra nada
    if (p.estado === 'decidido') { cerrar(p, t, ev.texto); return; }
    if (p.objetivo && id === 'coordinacion' && p.estado === 'enviado' && !p.ack) { p.ack = ev.texto; return; }   // "Dale. Reparto y vuelvo…"
    if (p.agentes[id]) p.agentes[id] = 'respondio';
    cerrar(p, t, ev.texto, id);
  }
  function cerrar(p, t, texto, de) { p.estado = 'cerrado'; p.cierre = texto; p.tFin = t ?? p.tUltimo; p.vivos = {}; hito(p, t, 'cierre', texto, de ? { de } : {}); }

  return {
    aplicar,
    /** La persona marca una acción del plan como hecha (o la vuelve a pendiente). */
    marcar(p, i, hecha = true) { if (p && p.plan && p.plan[i] && p.plan[i].estado !== 'descartada') p.plan[i].estado = hecha ? 'hecha' : 'pendiente'; },
    get actual() { return actual(); },
    get pedidos() { return pedidos; },
    /** El último objetivo cumplido, si el pedido actual es otro (para dejarlo como línea arriba). */
    get objetivoCumplido() { const p = actual(); const o = [...pedidos].reverse().find((x) => x.objetivo && x.estado === 'cerrado'); return o && o !== p ? o : null; },
    reiniciar() { pedidos = []; },
  };
}

/** Qué decidió la persona: 'aprobada' (todo tal cual), 'ajustes' (se reservó o descartó algo) o 'descartada' (nada). */
export function tipoDeDecision(decision, plan, texto = '') {
  const estados = decision && Array.isArray(decision.acciones) ? decision.acciones.map((a) => a && a.estado).filter(Boolean) : null;
  if (estados && estados.length) return estados.every((e) => e === 'no') ? 'descartada' : estados.every((e) => e === 'si') ? 'aprobada' : 'ajustes';
  if (plan && plan.length && plan.every((x) => x.estado === 'descartada')) return 'descartada';
  if ((plan && plan.some((x) => x.estado === 'descartada')) || /\b(la|lo|los|las)? ?(hago|llamo|hablo|tomo|veo) yo\b|me (la|lo) reservo|\bno\b/i.test(String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) return 'ajustes';
  return 'aprobada';
}
export const ETIQUETA_DECISION = { aprobada: 'Aprobada', ajustes: 'Aprobada con ajustes', descartada: 'Descartada' };

/**
 * El plan de acción que deja una decisión: [{ accion, responsable, estado: 'pendiente'|'descartada' }].
 * Con la decisión estructurada de la tarjeta ({ acciones: [{ texto, quien, estado: 'si'|'yo'|'no' }] }) es exacto.
 * Sin ella, se deduce de las acciones de la propuesta y del texto: la oración que nombra la acción dice
 * "lo hago yo" (la toma la persona), "no" (descartada) o nada (aprobada tal como se propuso).
 */
export function planDe(decision, acciones = [], texto = '', nombrePersona = 'Dirección') {
  const fila = (a, estado) => ({ accion: a.texto, responsable: estado === 'yo' ? nombrePersona : estado === 'no' ? '' : (a.quien || ''), estado: estado === 'no' ? 'descartada' : 'pendiente' });   // una descartada no tiene responsable
  if (decision && Array.isArray(decision.acciones)) return decision.acciones.filter((a) => a && a.texto).map((a) => fila(a, a.estado));
  if (!acciones.length) return null;
  const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const oraciones = norm(texto).split(/[.;!]\s*/).filter(Boolean);
  return acciones.map((a) => {
    const claves = norm(a.texto).split(/\s+/).filter((w) => w.length >= 5).map((w) => w.slice(0, 4));   // raíces: "llamada" ↔ "la llamo yo", "práctica" ↔ "practica"
    const o = oraciones.find((x) => claves.some((w) => x.includes(w)));
    const estado = !o ? 'si' : /\b(la|lo|los|las)? ?(hago|llamo|hablo|tomo|veo) yo\b|me (la|lo) reservo|yo mism/.test(o) ? 'yo' : /\bno\b/.test(o) ? 'no' : 'si';
    return fila(a, estado);
  });
}

// Mientras un agente piensa (entre que arranca y usa una herramienta o escribe), la tarjeta muestra palabras que giran.
// Son una simulación honesta de "está trabajando", no lo que el modelo piensa.
export const PALABRAS = {
  coordinacion: ['leyendo el pedido', 'mirando la lista del curso', 'decidiendo a quién pedirle qué', 'juntando lo que trajeron', 'armando la propuesta'],
  bienestar: ['repasando la asistencia', 'mirando el campus', 'buscando alertas anteriores', 'comparando fechas'],
  tutor: ['mirando las notas', 'repasando las consultas', 'viendo qué entra al parcial'],
  advisor: ['revisando cuotas', 'mirando inscripciones', 'buscando trámites abiertos', 'cruzando fechas'],
  admisiones: ['buscando la ficha de ingreso', 'repasando lo que dijo al inscribirse'],
  academia: ['mirando la oferta', 'leyendo qué se está pidiendo', 'probando nombres'],
  default: ['pensando', 'repasando los datos', 'escribiendo'],
};
export function palabraDe(id, desde, ahora, paso = 1400) {
  const lista = PALABRAS[id] || PALABRAS.default;
  return lista[Math.floor(Math.max(0, ahora - desde) / paso) % lista.length];
}

/** Lo que muestra la tarjeta del objetivo: { badge, items: [{ t, estado: 'ok'|'on'|'espera', texto, vivo? }], resumen?, siguiente? }. */
export function actividadDe(p, { nombreDe = (id) => id, ahora = 0, mostrarHerramienta = 6000 } = {}) {
  if (!p) return { badge: null, items: [] };
  const hora = (t) => { const s = Math.max(0, Math.round(((t ?? p.t0) - p.t0) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const lista = (xs) => xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];
  const textoHito = (h) => {
    if (h.tipo === 'reparto') return `Coordinación repartió el trabajo a ${lista(h.a.map(nombreDe))}`;
    if (h.tipo === 'aviso') return `${nombreDe(h.de)} le avisó algo a ${nombreDe(h.a)} sin que se lo pidieran`;
    if (h.tipo === 'respondio') return `${nombreDe(h.de)} respondió`;
    if (h.tipo === 'propuesta') return 'Coordinación trajo una propuesta';
    if (h.tipo === 'decision') return 'Decidiste';
    if (h.tipo === 'consulta') return `Le preguntaste a ${nombreDe(h.a)}`;
    if (h.tipo === 'consultado') return `${nombreDe(h.de)} respondió`;
    if (h.tipo === 'cierre') return p.objetivo ? 'Coordinación cerró: lo aprobado lo hacen personas' : `${nombreDe(h.de || 'coordinacion')} respondió`;
    return h.texto;
  };
  // Mientras los delegados trabajan, Coordinación no cuenta (espera): "Trabajando: 3 agentes", no 4
  const vivos = Object.keys(p.vivos); const otros = vivos.filter((id) => id !== 'coordinacion');
  const trabajando = (p.repartido && otros.some((id) => p.agentes[id]) ? otros : vivos).map(nombreDe);
  const hPropuesta = p.hitos.find((h) => h.tipo === 'propuesta');
  const preparacion = hPropuesta ? hora(hPropuesta.t) : null;   // tiempo de preparación: del objetivo a la propuesta
  const decision = p.decisionTipo ? { tipo: p.decisionTipo, texto: ETIQUETA_DECISION[p.decisionTipo] } : null;
  if (p.estado === 'cerrado') {
    // Ciclo de vida completo: de la primera a la última línea, con lo que decidiste y lo que quedó
    const items = p.hitos.filter((h) => ['recibido', 'reparto', 'propuesta', 'decision', 'cierre'].includes(h.tipo)).map((h) => ({ t: hora(h.t), estado: 'ok', texto: textoHito(h), detalle: h.tipo === 'decision' || h.tipo === 'cierre' ? h.texto : h.tipo === 'reparto' ? `${Object.keys(p.agentes).length} agentes, ${Object.values(p.agentes).filter((e) => e === 'respondio').length} respondieron${p.avisos ? `, ${p.avisos} aviso${p.avisos > 1 ? 's' : ''} entre ellos` : ''}` : null }));
    const dur = hora(p.tFin);
    const pendientes = (p.plan || []).filter((x) => x.estado === 'pendiente').length;
    return {
      // Cerrar la conversación no cumple el objetivo: el badge dice qué se decidió; la ejecución la mide el Tablero (la vista lo completa)
      badge: p.objetivo ? (decision ? { texto: decision.texto, tono: 'ok' } : { texto: 'Respondido', tono: 'ok' }) : { texto: `Respondido en ${dur}`, tono: 'ok' },
      items, plan: p.plan || null, preparacion, decision, total: dur,
      siguiente: pendientes ? `${pendientes === 1 ? 'Queda 1 acción' : `Quedan ${pendientes} acciones`} del plan: las hacen personas, y las marcás vos cuando estén hechas.` : p.objetivo ? 'Nada más para decidir. Podés darle otro objetivo a Coordinación o preguntarle a un agente por qué.' : null,
    };
  }
  const items = p.hitos.map((h) => ({ t: hora(h.t), estado: 'ok', texto: textoHito(h) }));
  for (const [id, v] of Object.entries(p.vivos)) {
    const herr = v.herramienta && ahora - v.tHerr < mostrarHerramienta ? v.herramienta : null;
    items.push({ t: null, estado: 'on', vivo: id, texto: herr ? `${nombreDe(id)} · ${herr}` : `${nombreDe(id)} ${palabraDe(id, v.desde, ahora)}…` });
  }
  if (p.estado === 'propuesta') items.push({ t: null, estado: 'espera', texto: 'Pendiente de tu revisión' });
  // Trabajo de los agentes: Analizando → Preparando propuesta → Propuesta preparada (= pendiente de tu revisión). Decisión: Aprobada / con ajustes / Descartada.
  const delegados = Object.keys(p.agentes);
  const todosRespondieron = delegados.length > 0 && delegados.every((id) => p.agentes[id] === 'respondio');
  const badge = p.estado === 'propuesta' ? { texto: 'Pendiente de tu revisión', tono: 'espera' }
    : p.estado === 'decidido' ? (decision ? { texto: decision.texto, tono: 'ok' } : { texto: 'Decidida', tono: 'ok' })
    : p.objetivo && todosRespondieron && (p.preparando || !trabajando.length) ? { texto: 'Preparando propuesta', tono: 'curso' }   // todos contestaron y nadie sigue trabajando (los avisos entre agentes cuentan como trabajo)
    : trabajando.length || p.repartido ? { texto: 'Analizando', tono: 'curso' }
    : { texto: 'Enviado', tono: 'curso' };
  return { badge, items: items.slice(-7), plan: p.plan || null, preparacion, decision, trabajando };
}
