// Lógica pura del chat del canal (sin DOM): limpieza del texto, @menciones, bloques (párrafos y casos numerados)
// y el hilo (orden, duplicados). La vista vive en index.html. Tests: `node --test stage/`.

const MENCION = /(@[A-Za-zÁÉÍÓÚáéíóúñÑ]+(?: [A-ZÁÉÍÓÚ][a-záéíóúñ]+)?)/;

/** Saca el markdown que el chat no dibuja (negritas, títulos) y los saltos de línea de más. */
export function limpiar(texto) {
  return String(texto || '').replace(/\r\n?/g, '\n').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Parte una línea en trozos de texto y @menciones: [{ texto, mencion }]. */
export function trozos(linea) {
  return String(linea || '').split(MENCION).map((texto, i) => ({ texto, mencion: i % 2 === 1 })).filter((t) => t.texto);
}

/**
 * Ordena el texto en bloques que la vista dibuja distinto:
 *  - { tipo: 'p', texto }       párrafo
 *  - { tipo: 'item', n, texto } caso numerado ("1. Ramiro B. …")
 *  - { tipo: 'detalle', texto } línea sangrada o con viñeta que sigue a un caso ("Por qué: …")
 */
export function bloques(texto) {
  const res = [];
  for (const crudo of limpiar(texto).split('\n')) {
    if (!crudo.trim()) continue;
    const item = crudo.match(/^\s*(\d+)[.)]\s+(.*\S)\s*$/);
    if (item) { res.push({ tipo: 'item', n: Number(item[1]), texto: item[2] }); continue; }
    const viñeta = crudo.match(/^\s*[-•*]\s+(.*\S)\s*$/);
    const sangrada = /^\s{2,}\S/.test(crudo) || /^\t/.test(crudo);
    const previo = res[res.length - 1];
    if ((viñeta || sangrada) && previo && previo.tipo !== 'p') { res.push({ tipo: 'detalle', texto: viñeta ? viñeta[1] : crudo.trim() }); continue; }
    res.push({ tipo: 'p', texto: crudo.trim() });
  }
  return res;
}

/** Primera línea con contenido, sin marca de lista: lo que se muestra de un mensaje ya leído. */
export function primeraLinea(texto) {
  const l = limpiar(texto).split('\n').find((x) => x.trim()) || '';
  return l.replace(/^\s*(\d+[.)]|[-•*])\s+/, '').trim();
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
