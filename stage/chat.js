// Lógica pura del chat del canal (sin DOM): limpieza del texto, @menciones, bloques (párrafos, fichas por
// estudiante, rótulos y casos numerados), la propuesta como lista de casos para la tarjeta de decisión, la
// redacción de la decisión y el hilo (orden, duplicados). La vista vive en index.html. Tests: `node --test stage/`.

const MENCION = /(@[A-Za-zÁÉÍÓÚáéíóúñÑ]+(?: [A-ZÁÉÍÓÚ][a-záéíóúñ]+)?)/;
// Lo que los agentes ponen al principio de una línea con dos puntos y no es un nombre de estudiante.
const ROTULOS = ['pendiente', 'propuesta para decidir', 'propuesta', 'borrador', 'para quién', 'para quien', 'cómo', 'como', 'módulos', 'modulos', 'falta validar', 'idea', 'nota', 'resumen', 'riesgo de equivocarnos', 'si nos equivocamos', 'riesgo'];
// "Martina R.", "Lucía P.", "Tomás", "Joaquín M." y también "Con lo de Advisor, cambio" (hasta 3 palabras antes de los dos puntos).
const FICHA = /^(?:Me preocupa |Me preocupan )?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?: [A-ZÁÉÍÓÚÑ]\.?| [A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2}):\s+(.*\S)\s*$/;   // "Me preocupa Joaquín: …" también es una ficha

/** Saca el markdown que el chat no dibuja (negritas, títulos) y los saltos de línea de más. */
export function limpiar(texto) {
  return String(texto || '').replace(/\r\n?/g, '\n').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Parte una línea en trozos de texto y @menciones: [{ texto, mencion }]. */
export function trozos(linea) {
  return String(linea || '').split(MENCION).map((texto, i) => ({ texto, mencion: i % 2 === 1 })).filter((t) => t.texto);
}

/** Las @menciones con que arranca un mensaje (a quién va) y el texto sin ellas: { para: ['Coordinación'], resto }. */
export function destinatario(texto) {
  let resto = limpiar(texto); const para = [];
  for (;;) { const m = resto.match(/^@([A-Za-zÁÉÍÓÚáéíóúñÑ]+)[,\s]*/); if (!m) break; para.push(m[1]); resto = resto.slice(m[0].length); }
  return { para, resto: resto.trim() };
}

/** "riesgo alto" / "riesgo medio" / "riesgo bajo" dentro de una línea, o null. */
export function riesgoDe(texto) { const m = String(texto || '').match(/riesgo\s+(alto|medio|bajo)/i); return m ? m[1].toLowerCase() : null; }

/** El nombre con que arranca un caso numerado ("Martina R., riesgo alto: …" → "Martina R."), o null.
 * Un caso también puede ser una cosa y no una persona ("Antes de cada parcial: …", la rutina que propone Coordinación): una frase corta hasta los dos puntos. */
export function nombreDeCaso(texto) {
  const t = String(texto || '');
  const m = t.match(/^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?: [A-ZÁÉÍÓÚÑ]\.?| [A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\s*[,:.]/); if (m) return m[1];
  const f = t.match(/^([A-ZÁÉÍÓÚÑ][^,:.;]{2,48}?):\s/); return f ? f[1].trim() : null;
}

/**
 * Ordena el texto en bloques que la vista dibuja distinto:
 *  - { tipo: 'p', texto }                       párrafo
 *  - { tipo: 'ficha', nombre, texto, riesgo }    una línea por estudiante ("Martina: 2 de 10 clases, riesgo alto")
 *  - { tipo: 'rotulo', rotulo, texto }           "Pendiente: …", "Nota: …", "Borrador: …"
 *  - { tipo: 'item', n, texto, nombre, riesgo }  caso numerado ("1. Martina R., riesgo alto: …")
 *  - { tipo: 'detalle', texto }                  línea sangrada o con viñeta que sigue a un caso
 */
export function bloques(texto) {
  const res = [];
  const lineas = limpiar(texto).split('\n').flatMap((l) => l.split(/(?<=[^\d\s][.;])\s+(?=[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?: [A-ZÁÉÍÓÚÑ]\.)?:\s)/));   // "…pendientes. Lucía: …" son dos fichas
  for (const crudo of lineas) {
    if (!crudo.trim()) continue;
    const item = crudo.match(/^\s*(\d+)[.)]\s+(.*\S)\s*$/);
    if (item) { res.push({ tipo: 'item', n: Number(item[1]), texto: item[2], nombre: nombreDeCaso(item[2]), riesgo: riesgoDe(item[2]) }); continue; }
    const viñeta = crudo.match(/^\s*[-•*]\s+(.*\S)\s*$/);
    const sangrada = /^\s{2,}\S/.test(crudo) || /^\t/.test(crudo);
    const previo = res[res.length - 1];
    if ((viñeta || sangrada) && previo && previo.tipo !== 'p') { res.push({ tipo: 'detalle', texto: viñeta ? viñeta[1] : crudo.trim() }); continue; }
    const linea = crudo.trim();
    const rot = linea.match(/^([^:@]{2,28}):\s+(.*\S)$/);
    if (rot && ROTULOS.includes(rot[1].trim().toLowerCase())) { res.push({ tipo: 'rotulo', rotulo: rot[1].trim(), texto: rot[2] }); continue; }
    const f = linea.match(FICHA);
    if (f && previo && previo.tipo === 'ficha' && previo.nombre === f[1]) { previo.texto += ' ' + f[2]; previo.riesgo = previo.riesgo || riesgoDe(f[2]); continue; }   // dos líneas con el mismo nombre son una ficha
    if (f) { res.push({ tipo: 'ficha', nombre: f[1], texto: f[2], riesgo: riesgoDe(f[2]) }); continue; }
    res.push({ tipo: 'p', texto: linea });
  }
  return res;
}

/** Primera línea con contenido, sin marca de lista ni @mención inicial: lo que se muestra de un mensaje ya leído. */
export function primeraLinea(texto) {
  const l = limpiar(texto).split('\n').find((x) => x.trim()) || '';
  return l.replace(/^\s*(\d+[.)]|[-•*])\s+/, '').replace(/^(@[A-Za-zÁÉÍÓÚáéíóúñÑ]+[,\s]*)+/, '').trim();
}

/** Los dos momentos de honestidad de la demo, detectados en el texto: 'limite' ("Eso no lo puedo hacer yo…") y 'no_se' ("No lo sé…"), o null.
 * El servidor la manda en el evento `dice` como `marca`; la vista la calcula si una grabación vieja no la trae. */
export function marcaDe(texto) {
  const t = limpiar(texto).replace(/^(@[A-Za-zÁÉÍÓÚáéíóúñÑ]+[,\s]*)+/, '');
  if (/^eso no (lo )?puedo hacer yo|^no (lo )?puedo (hacer|firmar|eximir|habilitar)|no lo hago (yo )?ni lo simulo/i.test(t)) return 'limite';
  if (/^no (lo )?s[eé](?=[\s.,:;!]|$)|^los datos no (lo )?dicen/i.test(t)) return 'no_se';   // sin \b: la é no es "palabra" para la expresión regular
  return null;
}
export const TEXTO_MARCA = { limite: 'No lo hace: lo firma una persona', no_se: 'Lo que los datos no dicen' };

/** ¿Es la propuesta de Coordinación, la que espera una decisión? */
export function esPropuesta(texto) { return /^\W*propuesta|para decidir|¿aprob|aprobás, editás/i.test(limpiar(texto)); }

/**
 * La propuesta como datos para la tarjeta de decisión:
 * { titulo, casos: [{ n, nombre, riesgo, texto }], notas, riesgoPropio, pendiente, pregunta }. Sin casos numerados devuelve casos: [].
 * `notas` son las líneas sueltas después de los casos ("Nota: …", "Lo de Advisor cambia el orden…"): la tarjeta las muestra, no las pierde.
 * `riesgoPropio` es la línea "Riesgo de equivocarnos: …": la objeción de Coordinación a su propia propuesta (el abogado del diablo).
 */
export function propuesta(texto) {
  const { resto } = destinatario(texto);
  const out = { titulo: '', casos: [], notas: [], riesgoPropio: '', pendiente: '', pregunta: '' };
  for (const b of bloques(resto)) {
    if (b.tipo === 'item') out.casos.push({ n: b.n, nombre: b.nombre || `Caso ${b.n}`, riesgo: b.riesgo, texto: b.texto, acciones: [] });
    else if (b.tipo === 'detalle' && out.casos.length) {
      const ult = out.casos[out.casos.length - 1]; const m = b.texto.match(/^acciones:\s*(.+)$/i);
      if (m) ult.acciones = parsearAcciones(m[1]); else ult.texto += ' ' + b.texto;
    }
    else if (b.tipo === 'rotulo' && /^pendiente$/i.test(b.rotulo)) { const [p, q] = partirPregunta(b.texto); out.pendiente = p; out.pregunta = q || out.pregunta; }
    else if (b.tipo === 'rotulo' && /propuesta/i.test(b.rotulo)) out.titulo = b.texto;
    else if (!out.casos.length && !out.titulo) out.titulo = b.texto.replace(/^propuesta para decidir:?\s*/i, '');
    else if (b.tipo === 'rotulo' && /^nota$/i.test(b.rotulo)) out.notas.push(b.texto);
    else if (b.tipo === 'rotulo' && /^(riesgo|si nos equivocamos)/i.test(b.rotulo)) out.riesgoPropio = b.texto;
    else { const [p, q] = partirPregunta(b.texto); if (q) { out.pregunta = q; if (p && !out.pendiente) out.pendiente = p; else if (p) out.notas.push(p); } else if (p) out.notas.push(p); }
  }
  for (const c of out.casos) {   // sin línea "Acciones:", la última oración "plan de pagos, Secretaría; llamada, Bienestar." también vale
    c.evidencia = c.texto;
    if (!c.acciones.length) {
      const oraciones = c.texto.replace(/\.\s*$/, '').split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/);
      const ultima = oraciones[oraciones.length - 1] || '';
      const partes = ultima.split(/\s*;\s*/);
      if (partes.length >= 2 && partes.every((p) => /^[^,]+,\s*[^,]+$/.test(p))) {
        c.acciones = partes.map((p) => { const [a, q] = p.split(/\s*,\s*/); return { texto: a.trim(), quien: q.trim() }; });
        c.evidencia = oraciones.slice(0, -1).join('. ') + (oraciones.length > 1 ? '.' : '');
      }
    }
  }
  return out;
}
/** "plan de pagos (Secretaría) · práctica guiada (docente) · llamada (Bienestar)" → [{ texto, quien }]. */
export function parsearAcciones(linea) {
  return String(linea || '').split(/\s*(?:·|;|\|)\s*/).map((p) => p.trim().replace(/\.$/, '')).filter(Boolean).map((p) => {
    const m = p.match(/^(.*?)\s*\(([^)]+)\)$/); if (m) return { texto: m[1].trim(), quien: m[2].trim() };
    const k = p.match(/^(.*?),\s*([^,]+)$/); return k ? { texto: k[1].trim(), quien: k[2].trim() } : { texto: p, quien: '' };
  });
}
function partirPregunta(t) { const m = String(t).match(/^(.*?)\s*(¿[^?]*\?)\s*$/); return m ? [m[1].trim(), m[2]] : [String(t).trim(), '']; }

/**
 * Redacta la decisión de la persona a partir de lo que marcó en la tarjeta.
 * decisiones: { [n]: { estado: 'aprobado'|'editado'|'rechazado', nota } }. Los casos sin marcar no se nombran.
 * → "Aprobado Martina R. y Lucía P. Tomás G.: refuerzo sí, pero con el docente. Joaquín M.: rechazado, lo llamo yo."
 */
export function redactarDecision(casos, decisiones) {
  const lista = (xs) => xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];
  const oracion = (t) => (/[.!?]$/.test(t) ? t : t + '.');   // "Lucía P." ya termina en punto
  const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const art = (t) => (/a$/i.test(t.split(' ')[0]) ? 'la' : 'lo');   // "la llamada la hago yo", "el plan lo hago yo"
  const partes = [];
  // Decisión por acción: { acciones: { [i]: 'si'|'yo'|'no' }, nota }
  for (const c of casos) {
    const d = decisiones[c.n]; if (!d || !d.acciones || !c.acciones?.length) continue;
    const si = [], yo = [], no = [];
    c.acciones.forEach((a, i) => { const e = d.acciones[i]; if (e === 'si') si.push(a.texto); else if (e === 'yo') yo.push(a.texto); else if (e === 'no') no.push(a.texto); });
    const frases = [];
    if (si.length) frases.push(`${mayus(lista(si))}, sí`);
    for (const a of yo) frases.push(`${art(a) === 'la' ? 'La' : 'El'} ${a} ${art(a)} hago yo`);   // "La llamada la hago yo": sin dos puntos, que el chat no lo lea como ficha
    if (no.length) frases.push(`${mayus(lista(no))}, no`);
    const nota = String(d.nota || '').trim().replace(/[.\s]+$/, '');
    if (nota) frases.push(mayus(nota));
    if (frases.length) partes.push((casos.length > 1 ? c.nombre + ': ' : '') + frases.map(oracion).join(' '));
  }
  const aprobados = casos.filter((c) => decisiones[c.n]?.estado === 'aprobado' && !decisiones[c.n].acciones).map((c) => c.nombre);
  if (aprobados.length) partes.push(oracion(`${aprobados.length > 1 ? 'Aprobados' : 'Aprobado'} ${lista(aprobados)}`));
  for (const c of casos) {
    const d = decisiones[c.n]; if (!d || d.acciones) continue;
    const nota = String(d.nota || '').trim().replace(/[.\s]+$/, '');
    if (d.estado === 'editado') partes.push(oracion(`${c.nombre}: ${nota || 'con cambios'}`));
    if (d.estado === 'rechazado') partes.push(oracion(`${c.nombre}: rechazado${nota ? ', ' + nota : ''}`));
  }
  return partes.join(' ');
}

/** El texto de un caso o una ficha sin el nombre ni "riesgo alto" al principio (eso va en el encabezado de la fila). */
export function cuerpoDeCaso(texto, nombre) {
  let t = String(texto || '').trim();
  if (nombre && t.startsWith(nombre)) t = t.slice(nombre.length).replace(/^\s*[,:.]?\s*/, '');
  t = t.replace(/^riesgo\s+(alto|medio|bajo)\s*(en lo académico)?\s*[,:.]?\s*/i, '').replace(/[,;]\s*riesgo\s+(alto|medio|bajo)(?=\s*[.,;]|$)/i, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * El hilo del canal. Cada mensaje: { clave?, autor, texto, hora?, t? }.
 * Sin duplicados (por clave), ordenado por t (si lo trae; si no, por llegada), con tope de mensajes.
 */
export function crearHilo({ tope = 60 } = {}) {
  let msgs = []; let vistos = new Set(); let seq = 0;
  return {
    get mensajes() { return msgs; },
    get ultimo() { return msgs[msgs.length - 1] || null; },
    /** Devuelve el mensaje agregado, o null si estaba repetido o vacío. */
    agregar(m) {
      if (m.clave && vistos.has(m.clave)) return null;
      const texto = limpiar(m.texto);
      if (!texto) return null;
      if (m.clave) vistos.add(m.clave);
      const msg = { ...m, texto, seq: seq++ };
      let i = msgs.length;
      if (typeof msg.t === 'number') while (i > 0 && typeof msgs[i - 1].t === 'number' && msgs[i - 1].t > msg.t) i--;
      msgs.splice(i, 0, msg);
      if (msgs.length > tope) msgs = msgs.slice(msgs.length - tope);
      return msg;
    },
    limpiar() { msgs = []; vistos = new Set(); seq = 0; },
  };
}
