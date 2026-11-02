// El bus de menciones: un "Buzz de juguete". Un solo canal (#coordinacion), una conversación por agente,
// y los mensajes despiertan a quien @mencionan. Es una máquina de estados sin I/O: el turno de un agente
// (las llamadas a la API) lo corre `correrTurno`, inyectado, y los temporizadores también se inyectan,
// así los tests no esperan ni tocan la red.
//
// Reglas (ver docs/bus.md): un estado por agente; el servidor sabe a quién espera cada uno (pendientes);
// un despertar provocado por agentes no arranca hasta que los que deben respuesta callan, ni mientras
// alguno de los que X mandó a trabajar en su último turno siga activo (aunque ya haya contestado: puede
// estar ajustando por un aviso de otro), ni mientras alguien a quien esos delegados sumaron siga activo (el equipo
// crece); si alguien termina sin contestar, al que esperaba se le avisa; topes de saltos, turnos y mensajes.

export const LIMITES = {
  espera: 1500,          // ms que se juntan mensajes antes de arrancar un turno
  reintento: 500,        // ms entre chequeos mientras se retiene un despertar
  retencionMax: 90000,   // ms como mucho reteniendo un despertar por los que faltan (un turno con 24 herramientas tarda ~60 s)
  saltoMax: 5,           // profundidad de cadena agente→agente que todavía despierta
  turnos: { coordinacion: 10, otros: 6 },
  mensajes: 40,          // mensajes de agentes por corrida
};

/**
 * @param {object} o
 * @param {Array<{id: string, nombre: string}>} o.agentes
 * @param {{id: string, nombre: string}} o.persona
 * @param {(texto: string, o: object) => {a: string[], invalidas: string[], nombres: string[]}} o.resolver  de menciones.mjs
 * @param {(id: string, lote: object, ctx: object) => Promise<void>} o.correrTurno  corre un turno del agente contra la API
 * @param {Function} [o.programar]  (ms, fn) => handle   · @param {Function} [o.cancelar]  (handle)
 * @param {Function} [o.ahora]      () => epoch ms
 * @param {boolean} [o.entregaEnTurno]  entregar mensajes que llegan en medio de un turno junto con los tool_result
 */
export function crearBus({ agentes, persona, resolver, correrTurno, programar = (ms, fn) => setTimeout(fn, ms), cancelar = clearTimeout, ahora = Date.now, limites = {}, entregaEnTurno = true, log = () => {} }) {
  const L = { ...LIMITES, ...limites, turnos: { ...LIMITES.turnos, ...(limites.turnos || {}) } };
  const nombreDe = new Map(agentes.map((a) => [a.id, a.nombre])); nombreDe.set(persona.id, persona.nombre);
  const oyentes = new Set();
  const ag = new Map();
  let S;   // estado de la corrida

  function reiniciar() {
    if (S) { S.epoca++; for (const a of ag.values()) if (a.temporizador) cancelar(a.temporizador); }
    const epoca = S ? S.epoca : 0;
    S = { epoca, inicio: ahora(), chat: [], linea: [], seq: 0, mensajesAgentes: 0, frame: [], frameProgramado: false };
    ag.clear();
    for (const a of agentes) ag.set(a.id, { id: a.id, nombre: a.nombre, estado: 'inactivo', cola: [], turnos: 0, pendientes: new Set(), equipo: new Set(), sinRespuesta: [], temporizador: null, retenidoDesde: null, promesa: Promise.resolve(), turno: null });
  }
  reiniciar();

  const hora = (t) => new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  // ── Eventos para la vista: los del mismo macrotask salen en un solo frame ──
  function emitir(ev) {
    const e = { t: ahora() - S.inicio, ...ev };
    S.linea.push(e); S.frame.push(e); S.seq++;
    if (!S.frameProgramado) { S.frameProgramado = true; queueMicrotask(() => { const f = S.frame; S.frame = []; S.frameProgramado = false; for (const o of oyentes) o(f); }); }
    return e;
  }

  const topeTurnos = (a) => a.turnos >= (L.turnos[a.id] ?? L.turnos.otros);

  // ── Publicar: chat + evento + despertar a los mencionados ──
  function publicar({ de, texto, a, salto = 0, decision = null, verificacion = null, marca = null }) {
    const t = ahora();
    const m = { id: 's' + S.seq + '-' + t, de, nombre: nombreDe.get(de) || de, texto, a, hora: hora(t), t: t - S.inicio, salto, ...(verificacion ? { verificacion } : {}) };
    S.chat.push(m);
    const esPersona = de === persona.id;
    if (!esPersona) S.mensajesAgentes++;
    emitir(esPersona ? { tipo: 'persona', quien: de, nombre: m.nombre, a, texto, hora: m.hora, id: m.id, ...(decision ? { decision } : {}) }
                     : { tipo: 'dice', quien: de, a, texto, hora: m.hora, id: m.id, ...(verificacion ? { verificacion } : {}), ...(marca ? { marca } : {}) });
    const emisor = ag.get(de);
    const despertados = [], noDespiertan = [];
    for (const id of a) {
      const x = ag.get(id); if (!x) continue;
      x.pendientes.delete(de);                       // ya le contestó (o le escribió): deja de esperarlo
      if (emisor && emisor.turno) emisor.turno.hablo.add(id);
      const despierta = esPersona || (salto <= L.saltoMax && !topeTurnos(x) && S.mensajesAgentes <= L.mensajes);
      x.cola.push({ ...m, despierta });
      // Espera respuesta solo si le escribe a alguien que no le había escrito: contestar no crea expectativa
      if (despierta) {
        despertados.push(id); if (emisor && emisor.turno && !emisor.turno.remitentes.includes(id)) { emisor.pendientes.add(id); emisor.turno.equipo.add(id); }
        // El equipo crece: si un delegado de X suma a alguien más (Advisor le pregunta a Admisiones), X también lo espera
        if (emisor) for (const y of ag.values()) if (y !== emisor && y.id !== id && y.equipo.has(de)) y.equipo.add(id);
        if (x.estado !== 'corriendo') programarArranque(x, esPersona);
      }
      else noDespiertan.push(id);
    }
    log('msg', m.nombre, '→', a.join(','), despertados.length ? '' : '(no despierta)');
    return { mensaje: m, despertados, noDespiertan };
  }

  // ── Despertar, retener, arrancar ──
  function programarArranque(x, urgente = false) {
    if (x.estado === 'corriendo') return;
    x.estado = 'esperando';
    if (x.retenidoDesde == null) x.retenidoDesde = ahora();
    if (x.temporizador) cancelar(x.temporizador);
    x.temporizador = programar(L.espera, () => { x.temporizador = null; intentarArranque(x); });
    if (urgente) x.urgente = true;
  }
  function intentarArranque(x) {
    if (x.estado !== 'esperando') return;
    if (!x.cola.some((m) => m.despierta) && !x.sinRespuesta.length && !x.urgente) { x.estado = 'inactivo'; x.retenidoDesde = null; return; }
    const humano = x.urgente || x.cola.some((m) => m.de === persona.id);
    const vencido = ahora() - x.retenidoDesde >= L.retencionMax;
    // Retiene mientras alguno de los que X espera, o de los que mandó a trabajar, siga corriendo o por correr
    const hablando = [...new Set([...x.pendientes, ...x.equipo])].filter((id) => { const p = ag.get(id); return p && (p.estado === 'corriendo' || p.estado === 'esperando'); });
    if (hablando.length && !humano && !vencido) { x.temporizador = programar(L.reintento, () => { x.temporizador = null; intentarArranque(x); }); return; }
    arrancarTurno(x, { vencido: vencido && hablando.length > 0 });
  }
  function arrancarTurno(x, { vencido }) {
    x.estado = 'corriendo'; x.turnos++; x.urgente = false; x.retenidoDesde = null;
    const mensajes = x.cola.splice(0);
    const faltan = vencido ? [...x.pendientes].map((id) => nombreDe.get(id)) : [];
    const terminaronSin = x.sinRespuesta.splice(0);
    const remitentes = [...new Set(mensajes.map((m) => m.de))];
    const salto = Math.max(0, ...mensajes.map((m) => m.salto)) + 1;
    const turno = { hablo: new Set(), equipo: new Set(), remitentes, salto, epoca: S.epoca };
    x.turno = turno;
    const lote = { mensajes, faltan, terminaronSin };
    emitir({ tipo: 'inicio', quien: x.id });
    log('turno', x.nombre, `#${x.turnos}`, mensajes.length + ' msg', faltan.length ? 'faltan ' + faltan : '', terminaronSin.length ? 'sin respuesta ' + terminaronSin : '');
    const ctx = {
      epoca: turno.epoca,
      vigente: () => turno.epoca === S.epoca,
      /** El agente manda un mensaje al canal. Devuelve el texto para el tool_result; lanza si la mención no existe. */
      enviar(texto, opciones = {}) {
        const { explicitos = [], verificacion = null, marca = null } = Array.isArray(opciones) ? { explicitos: opciones } : opciones;   // verificacion: del verificador; marca: 'limite' | 'no_se' (agente.mjs)
        if (!ctx.vigente()) return 'La corrida se reinició.';
        const r = resolver(texto, { de: x.id, explicitos, porDefecto: remitentes });
        if (r.invalidas.length) throw new Error(`No reconozco @${r.invalidas.join(', @')}. Destinatarios: ${r.nombres.join(', ')}.`);
        if (!r.a.length) throw new Error(`¿A quién? Mencioná con @Nombre. Destinatarios: ${r.nombres.join(', ')}.`);
        const { despertados, noDespiertan } = publicar({ de: x.id, texto, a: r.a, salto, verificacion, marca });
        const n = (ids) => ids.map((id) => nombreDe.get(id)).join(', ');
        let out = `Enviado a ${n(r.a)}.`;
        if (!/@/.test(texto)) out = `Enviado a ${n(r.a)} (sin @mención: le respondés a quien te escribió).`;
        if (noDespiertan.length) out += ` Aviso: ${n(noDespiertan)} no va a responder (límite de la corrida).`;
        if (topeTurnos(x)) out += ' Aviso: llegaste al límite de turnos de la corrida; nadie te va a volver a despertar hasta que hable una persona.';
        return out;
      },
      /** Mensajes que llegaron mientras corría el turno (se entregan junto con los tool_result). */
      nuevos() { if (!entregaEnTurno || !x.cola.length) return []; return x.cola.splice(0); },
      /** ¿El servidor le dijo que espere a alguien? (entonces un turno sin mensaje es legítimo) */
      esperaAAlguien: () => x.pendientes.size > 0,
      lePidieron: () => mensajes.some((m) => m.de !== x.id),
      emitir: (ev) => { if (ctx.vigente()) emitir({ quien: x.id, ...ev }); },
    };
    x.promesa = x.promesa
      .then(() => correrTurno(x.id, lote, ctx))
      .catch((e) => { log('error', x.nombre, e && e.message); })
      .then(() => finTurno(x, turno));
  }
  function finTurno(x, turno) {
    if (turno.epoca !== S.epoca) return;
    x.turno = null; x.equipo = turno.equipo;   // a quiénes mandó a trabajar: los espera aunque ya le hayan contestado
    emitir({ tipo: 'fin', quien: x.id });
    // R4: a quien lo esperaba y no le escribió, se le avisa. Se lo despierta solo si ya estaba por arrancar
    // (retenido o con mensajes); si está quieto, el aviso espera a su próximo turno: no vale un turno por sí solo.
    for (const y of ag.values()) {
      if (!y.pendientes.has(x.id) || turno.hablo.has(y.id)) continue;
      y.pendientes.delete(x.id); y.sinRespuesta.push(x.nombre);
      if (y.estado === 'esperando' || (y.estado === 'inactivo' && y.cola.some((m) => m.despierta))) programarArranque(y);
    }
    x.estado = 'inactivo';
    if (x.cola.some((m) => m.despierta)) programarArranque(x);
  }

  return {
    /** Mensaje de la persona (desde el navegador). Sin mención, le habla a Coordinación. */
    mensajePersona(texto, { decision = null } = {}) {
      const r = resolver(texto, { de: persona.id, porDefecto: ['coordinacion'] });
      if (r.invalidas.length) return { a: [], despertados: [], invalidas: r.invalidas, nombres: r.nombres };   // no se manda: un dedazo no debe ir a Coordinación
      const { despertados } = publicar({ de: persona.id, texto, a: r.a, salto: 0, decision });   // `decision`: la de la tarjeta, estructurada; va en el evento y queda en la grabación
      return { a: r.a, despertados, invalidas: [] };
    },
    reiniciar,
    /** Cambia el nombre de la persona que decide (firma sus mensajes de acá en adelante). */
    renombrarPersona(nombre) { persona.nombre = nombre; nombreDe.set(persona.id, nombre); },
    /** Un evento que no es un mensaje (p. ej. del Tablero): va a la vista y a la grabación. */
    emitir: (ev) => emitir(ev),
    suscribir(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },
    snapshot: () => ({ eventos: S.linea.slice() }),
    chat: () => S.chat.slice(),
    estado: () => ({ epoca: S.epoca, mensajes: S.mensajesAgentes, agentes: [...ag.values()].map((a) => ({ id: a.id, estado: a.estado, turnos: a.turnos, pendientes: [...a.pendientes], cola: a.cola.length })) }),
    corrida: () => ({ origen: 'servidor/escuela.mjs', generado: new Date().toISOString(), eventos: S.linea.slice() }),
    // para tests
    _ag: ag,
  };
}
