// El verificador de datos: cada cifra y fecha que un agente escribe se comprueba por código contra lo que le
// devolvieron sus herramientas (fuente propia) y lo que le dijeron otros (fuente ajena). No interviene ningún
// modelo: es texto contra texto. Lo que coincide lleva un tilde en la vista; lo que no, una marca; y el E2E lo
// cuenta ("cifras sin comprobar: 0"). Sin I/O.
//
// Estados de un dato:
//   verificado     está en un resultado de herramienta del propio agente (o lo citó de alguien que lo tenía verificado)
//   citado         está en un mensaje que le mandó otro agente o la persona (fuente de segunda mano)
//   derivado       es un cálculo del agente ("ocho días", "los otros 23"): no se comprueba, no se penaliza
//   no_comprobado  "N de M" cuyos números existen pero no como par (resueltos/totales, presentes/clases): el cruce es del agente
//   sin_fuente     no aparece en ninguna fuente
//
// "N de M" se comprueba contra campos hermanos donde M es un total (clases, ejercicios_totales, cupo, total): así "3 de 14"
// (3 resueltos, 14 consultas) no pasa aunque los dos números existan.

const NUM = '\\d+(?:[.,]\\d+)?';
const RE_DATO = new RegExp(`(?<![\\p{L}\\d.,/@-])(?:(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?(?![\\d/])|(${NUM})\\s+de\\s+(${NUM})(?!\\d)|(${NUM}))(?![\\p{L}\\d/])`, 'gu');
const UNIDAD_DERIVADA = /^\s*(d[ií]as?|semanas?|meses?|a[ñn]os?|veces|puntos?|horas?|minutos?)\b/i;
const PREFIJO_DERIVADO = /(otr[oa]s|resto de|dem[aá]s|restantes?|en|plan de|plan de pagos de|propongo|hasta|m[aá]s de|menos de|al menos|unas?|unos)\s*$/i;   // lo que es propuesta o cálculo del agente ("plan de 3 cuotas", "en 3 cuotas") no es un dato
const NOMBRE_CON_NUMERO = /\b(Biolog[ií]a|Parcial|TP|Qu[ií]mica|F[ií]sica|Matem[aá]tica|Historia|Comisi[oó]n)\s+\d+/gi;
const TOTAL = /^(clases|ejercicios_totales|totales?|total|cupo|cantidad|parciales_disponibles|disponibles|preinscriptos)$/i;

const claveNumero = (x) => String(Number(String(x).replace(',', '.')));
const claveFecha = (d, m) => `${Number(d)}/${Number(m)}`;

/** Los datos que afirma un mensaje: [{ texto, clave, tipo: 'fecha'|'par'|'numero', derivado }]. */
export function datosDe(texto) {
  const limpio = String(texto || '').replace(/\r\n?/g, '\n').replace(/@\S+/g, '').split('\n').map((l) => l.replace(/^\s*\d+[.)]\s+/, '')).join('\n')   // "1." de lista no es un dato
    .replace(NOMBRE_CON_NUMERO, (m) => m.replace(/\d+/, ''));                                                                               // "Parcial 2" es un nombre
  const out = [];
  for (const m of limpio.matchAll(RE_DATO)) {
    const antes = limpio.slice(Math.max(0, m.index - 14), m.index), despues = limpio.slice(m.index + m[0].length, m.index + m[0].length + 12);
    const derivado = UNIDAD_DERIVADA.test(despues) || PREFIJO_DERIVADO.test(antes);
    if (m[1]) out.push({ texto: m[0], clave: claveFecha(m[1], m[2]), tipo: 'fecha', derivado: false });
    else if (m[4]) out.push({ texto: m[0], clave: `${claveNumero(m[4])}|${claveNumero(m[5])}`, tipo: 'par', derivado });
    else out.push({ texto: m[0], clave: claveNumero(m[6]), tipo: 'numero', derivado });
  }
  return out;
}

/** Las claves que sostiene una fuente (el texto de un tool_result, JSON o no): { claves: Set, pares: Set }. */
export function fuenteDe(texto) {
  const claves = new Set(), pares = new Set();
  const deTexto = (s) => {
    for (const m of String(s).matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) claves.add(claveFecha(m[3], m[2]));
    for (const m of String(s).matchAll(/(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/g)) claves.add(claveFecha(m[1], m[2]));
    for (const m of String(s).matchAll(/(?<![\p{L}\d.,-])\d+(?:[.,]\d+)?(?![\p{L}\d])/gu)) claves.add(claveNumero(m[0]));
  };
  let json = null; try { json = JSON.parse(texto); } catch { deTexto(texto); return { claves, pares }; }
  const esNum = (v) => typeof v === 'number' || (typeof v === 'string' && /^\d+(?:[.,]\d+)?$/.test(v));
  const andar = (v) => {
    if (Array.isArray(v)) { claves.add(String(v.length)); v.forEach(andar); return; }
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) deTexto(k.replace(/_/g, ' '));   // los números de los nombres de campo también son dato ("otorgadas_2027" sostiene "2027")
      const nums = Object.entries(v).filter(([, x]) => esNum(x));
      for (const [k, x] of nums) { if (TOTAL.test(k)) for (const [, y] of nums) if (y !== x) pares.add(`${claveNumero(y)}|${claveNumero(x)}`); }
      for (const x of Object.values(v)) andar(x); return;
    }
    if (typeof v === 'number') claves.add(claveNumero(v)); else if (typeof v === 'string') deTexto(v);
  };
  andar(json);
  return { claves, pares };
}

/**
 * Verifica un mensaje contra las fuentes del agente.
 * @param {string} texto
 * @param {{ propias: Array<{claves: Set, pares: Set}>, ajenas: Array<{ texto: string, datos?: Array<{clave, estado}> }> }} fuentes
 * @returns {{ datos: Array<{texto, estado}>, resumen: { verificados, citados, derivados, noComprobados, sinFuente } }}
 */
export function verificar(texto, { propias = [], ajenas = [] } = {}) {
  const propia = (c) => propias.some((f) => f.claves.has(c));
  const propioPar = (c) => propias.some((f) => f.pares.has(c));
  // Lo ajeno: una tabla clave → estado (de quien lo dijo, si lo trae; si no, "citado"). La duda se hereda.
  const ajeno = new Map();
  for (const m of ajenas) {
    const lista = m.datos && m.datos.length ? m.datos : datosDe(m.texto).map((d) => ({ clave: d.clave, estado: 'citado' }));
    for (const d of lista) { const e = d.estado === 'verificado' ? 'verificado' : d.estado === 'sin_fuente' || d.estado === 'no_comprobado' ? d.estado : 'citado'; ajeno.set(d.clave, ajeno.has(d.clave) ? mejor(ajeno.get(d.clave), e) : e); }
  }
  const datos = datosDe(texto).map((d) => {
    let estado;
    if (d.derivado) estado = 'derivado';
    else if (d.tipo === 'par') {
      const [a, b] = d.clave.split('|');
      if (propioPar(d.clave)) estado = 'verificado';
      else if (ajeno.has(d.clave)) estado = ajeno.get(d.clave);
      else if ((propia(a) || ajeno.has(a)) && (propia(b) || ajeno.has(b))) estado = 'no_comprobado';
      else estado = 'sin_fuente';
    } else if (propia(d.clave)) estado = 'verificado';
    else if (ajeno.has(d.clave)) estado = ajeno.get(d.clave);
    else estado = 'sin_fuente';
    return { texto: d.texto, clave: d.clave, estado };
  });
  const resumen = { verificados: 0, citados: 0, derivados: 0, noComprobados: 0, sinFuente: 0 };
  for (const d of datos) resumen[{ verificado: 'verificados', citado: 'citados', derivado: 'derivados', no_comprobado: 'noComprobados', sin_fuente: 'sinFuente' }[d.estado]]++;
  return { datos, resumen };
}
const ORDEN = ['verificado', 'citado', 'derivado', 'no_comprobado', 'sin_fuente'];
const mejor = (a, b) => (ORDEN.indexOf(a) <= ORDEN.indexOf(b) ? a : b);

/** Los datos que no se pudieron comprobar (para el E2E y el log): textos de sin_fuente y no_comprobado. */
export const dudosos = (v) => (v && v.datos ? v.datos.filter((d) => d.estado === 'sin_fuente' || d.estado === 'no_comprobado').map((d) => d.texto) : []);
/** Cuántos tienen fuente (verificados + citados). */
export const conFuente = (v) => (v && v.resumen ? v.resumen.verificados + v.resumen.citados : 0);
